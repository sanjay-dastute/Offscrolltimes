import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { beginSocialOAuth, isSocialProvider, readSession, revokeSession, testing, type SessionData } from './auth.server'
import { isAdministratorUserId } from './admin/auth.server'
import { createTestD1 } from './lifecycle/testing'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from './lifecycle/env.server'

let db: D1Database

const previous = {
  session: process.env.SESSION_SECRET,
  googleId: process.env.GOOGLE_CLIENT_ID,
  googleSecret: process.env.GOOGLE_CLIENT_SECRET,
  admins: process.env.ADMIN_IDENTITY_IDS,
}

beforeEach(() => {
  process.env.SESSION_SECRET = 'social-auth-test-secret-with-at-least-32-characters'
  process.env.GOOGLE_CLIENT_ID = 'google-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret'
  process.env.ADMIN_IDENTITY_IDS = 'google:admin-subject,microsoft:admin-object'
  db = createTestD1()
  initRequestLifecycleBindings({ LIFECYCLE_DB: db, LIFECYCLE_SECRET: 'social-auth-lifecycle-secret-at-least-32-characters' })
})

afterEach(() => {
  resetRequestLifecycleBindings()
  const restore = (name: string, value: string | undefined) => value === undefined ? delete process.env[name] : process.env[name] = value
  restore('SESSION_SECRET', previous.session)
  restore('GOOGLE_CLIENT_ID', previous.googleId)
  restore('GOOGLE_CLIENT_SECRET', previous.googleSecret)
  restore('ADMIN_IDENTITY_IDS', previous.admins)
})

describe('social authentication and role boundaries', () => {
  it('accepts only the configured social providers', () => {
    expect(isSocialProvider('google')).toBe(true)
    expect(isSocialProvider('microsoft')).toBe(true)
    expect(isSocialProvider('legacy')).toBe(false)
    expect(isSocialProvider('../google')).toBe(false)
  })

  it('starts Google OAuth with PKCE without exposing the client secret', async () => {
    const response = await beginSocialOAuth(
      new Request('http://localhost:3000/auth/google/start?return_to=%2Faccount'),
      'google',
      '/account',
    )
    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe('https://accounts.google.com')
    expect(location.searchParams.get('client_id')).toBe('google-client-id')
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/google/callback')
    expect(location.searchParams.get('scope')).toBe('openid email profile')
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('code_challenge')).toBeTruthy()
    expect(location.searchParams.get('nonce')).toBeTruthy()
    expect(response.headers.get('set-cookie')).toContain('__Host-offscroll_oauth=')
    expect(`${location}${response.headers.get('set-cookie')}`).not.toContain('google-client-secret')
  })

  it('rejects unsafe local return destinations', () => {
    expect(testing.safeLocalReturn('/account?tab=payments')).toBe('/account?tab=payments')
    expect(testing.safeLocalReturn('//evil.example')).toBeUndefined()
    expect(testing.safeLocalReturn('https://evil.example')).toBeUndefined()
    expect(testing.safeLocalReturn('/\\evil')).toBeUndefined()
  })

  it('grants administration only to explicitly configured provider identities', () => {
    expect(isAdministratorUserId('google:admin-subject')).toBe(true)
    expect(isAdministratorUserId('microsoft:admin-object')).toBe(true)
    expect(isAdministratorUserId('google:customer-subject')).toBe(false)
    expect(isAdministratorUserId('admin@offscrolltimes.com')).toBe(false)
  })

  it('stores only a session-token hash and supports immediate revocation', async () => {
    const identity = await testing.persistSocialIdentity('google','customer-subject','customer@example.com')
    const session: SessionData = {accessToken:'',refreshToken:'',expiresAt:0,user:{id:identity.ownerId,email:'customer@example.com',provider:'google'},csrf:'csrf-value'}
    const setCookie = await testing.databaseSessionCookie(session,identity.userId)
    const raw = decodeURIComponent(setCookie.split(';')[0].split('=').slice(1).join('='))
    const stored = await db.prepare(`SELECT token_hash FROM application_sessions`).first<{token_hash:string}>()
    expect(stored?.token_hash).toBeTruthy()
    expect(stored?.token_hash).not.toContain(raw)
    const request = new Request('https://offscrolltimes.com/account',{headers:{cookie:`__Host-offscroll_session=${encodeURIComponent(raw)}`}})
    const authenticated = await readSession(request)
    expect(authenticated?.user.id).toBe(identity.ownerId)
    await revokeSession(authenticated)
    expect(await readSession(request)).toBeNull()
  })

  it('links a second provider to the authenticated internal user without email-based merging', async () => {
    const first = await testing.persistSocialIdentity('google','first-subject','same@example.com')
    const separate = await testing.persistSocialIdentity('microsoft','separate-subject','same@example.com')
    await expect(testing.persistSocialIdentity('microsoft','separate-subject','same@example.com',first.userId)).rejects.toThrow('identity_already_linked')
    const linked = await testing.persistSocialIdentity('microsoft','linked-subject','other@example.com',first.userId)
    expect(linked.ownerId).toBe(first.ownerId)
    expect(linked.userId).toBe(first.userId)
    expect(linked.userId).not.toBe(separate.userId)
    const identities = await db.prepare(`SELECT provider FROM auth_identities WHERE user_id=? ORDER BY provider`).bind(first.userId).all<{provider:string}>()
    expect(identities.results.map(row=>row.provider)).toEqual(['google','microsoft'])
    expect(await db.prepare(`SELECT action FROM identity_security_events WHERE actor_user_id=?`).bind(first.userId).first<{action:string}>()).toMatchObject({action:'identity_linked'})
  })
})
