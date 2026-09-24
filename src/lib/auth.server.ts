import { base64url, fromBase64url } from './codec'
import { allowRequest } from '#/lib/rate-limit.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'

const SEALED_SESSION_COOKIE = '__Host-offscroll_sealed_session'
const APP_SESSION_COOKIE = '__Host-offscroll_session'
const SOCIAL_FLOW_COOKIE = '__Host-offscroll_oauth'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type SessionData = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: { id: string; name?: string; username?: string; email?: string; provider?: 'google' | 'microsoft' }
  csrf: string
  sessionId?: string
  internalUserId?: string
}

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) throw new Error('Session encryption is unavailable.')
  return value
}

function random(size = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(size)))
}

async function key(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret()))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function seal(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(),
    encoder.encode(JSON.stringify(value)),
  )
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`
}

async function open<T>(value: string | undefined): Promise<T | null> {
  if (!value) return null
  try {
    const [ivText, ciphertextText] = value.split('.')
    if (!ivText || !ciphertextText) return null
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64url(ivText) },
      await key(),
      fromBase64url(ciphertextText),
    )
    return JSON.parse(decoder.decode(plaintext)) as T
  } catch {
    return null
  }
}

function cookies(request: Request): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index < 1) continue
    result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return result
}

function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

export function clearAuthCookies(): string[] {
  return [cookie(SEALED_SESSION_COOKIE, '', 0), cookie(APP_SESSION_COOKIE, '', 0), cookie(SOCIAL_FLOW_COOKIE, '', 0)]
}

async function tokenHash(value: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))))
}

async function readDatabaseSession(value: string | undefined): Promise<SessionData | null> {
  if (!value || !/^[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{32,}$/.test(value)) return null
  let db: D1Database
  try { db = lifecycleBindings().db } catch { return null }
  const [id] = value.split('.')
  const row = await db.prepare(`SELECT session_json,expires_at,revoked_at FROM application_sessions WHERE id=? AND token_hash=?`)
    .bind(id, await tokenHash(value)).first<{session_json:string;expires_at:number;revoked_at:number|null}>()
  if (!row || row.revoked_at || row.expires_at <= Date.now()) return null
  try {
    const session = JSON.parse(row.session_json) as SessionData
    session.sessionId = id
    return session
  } catch { return null }
}

export async function readSession(request: Request): Promise<SessionData | null> {
  const values = cookies(request)
  return await readDatabaseSession(values[APP_SESSION_COOKIE]) ?? open<SessionData>(values[SEALED_SESSION_COOKIE])
}

export async function sessionCookie(session: SessionData): Promise<string> {
  return cookie(SEALED_SESSION_COOKIE, await seal(session), 60 * 60 * 24 * 30)
}

async function databaseSessionCookie(session: SessionData, internalUserId: string): Promise<string> {
  const id = `session_${random(18)}`
  const raw = `${id}.${random(36)}`
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
  const stored: SessionData = { ...session, sessionId: id, internalUserId, expiresAt }
  const db = lifecycleBindings().db
  await db.prepare(`INSERT INTO application_sessions(id,user_id,token_hash,session_json,expires_at,created_at,last_seen_at)
    VALUES(?,?,?,?,?,?,?)`).bind(id,internalUserId,await tokenHash(raw),JSON.stringify(stored),expiresAt,Date.now(),Date.now()).run()
  return cookie(APP_SESSION_COOKIE, raw, 60 * 60 * 24 * 30)
}

async function challenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))))
}

function safeLocalReturn(value: string | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined
  try {
    const url = new URL(value, 'https://local.invalid')
    return url.origin === 'https://local.invalid' ? `${url.pathname}${url.search}${url.hash}` : undefined
  } catch {
    return undefined
  }
}

export async function revokeSession(session: SessionData | null): Promise<void> {
  if (session?.sessionId) {
    try {
      await lifecycleBindings().db.prepare(`UPDATE application_sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL`)
        .bind(Date.now(),session.sessionId).run()
    } catch { /* Logout still clears the browser cookie when persistence is unavailable. */ }
  }
}

export type SocialProvider = 'google' | 'microsoft'

type SocialFlow = {
  provider: SocialProvider
  state: string
  nonce: string
  verifier: string
  returnTo: string
  mode: 'login' | 'link'
  linkUserId?: string
  expiresAt: number
}

type OidcClaims = {
  sub?: unknown
  aud?: unknown
  iss?: unknown
  exp?: unknown
  nonce?: unknown
  email?: unknown
  email_verified?: unknown
  name?: unknown
  preferred_username?: unknown
  tid?: unknown
}

const socialProviders = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET ?? '',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    scope: 'openid email profile',
  },
  microsoft: {
    clientId: () => process.env.MICROSOFT_CLIENT_ID ?? '',
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET ?? '',
    authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    jwks: 'https://login.microsoftonline.com/common/discovery/v2.0/keys',
    scope: 'openid email profile',
  },
} as const

export function isSocialProvider(value: string): value is SocialProvider {
  return value === 'google' || value === 'microsoft'
}

function socialCallback(origin: string, provider: SocialProvider): string {
  const allowed = new Set([
    'http://localhost:3000',
    'https://offscrolltimes.com',
    'https://www.offscrolltimes.com',
    ...(process.env.AUTH_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean),
  ])
  const safeOrigin = allowed.has(origin) ? origin : 'https://offscrolltimes.com'
  return `${safeOrigin}/auth/${provider}/callback`
}

export async function beginSocialOAuth(request: Request, provider: SocialProvider, returnTo?: string, mode: 'login' | 'link' = 'login'): Promise<Response> {
  if (!await allowRequest(request, 'oauth_start', 10, 10 * 60 * 1000)) {
    return new Response('Too many sign-in attempts. Try again shortly.', { status: 429, headers: { 'Retry-After': '600' } })
  }
  const config = socialProviders[provider]
  const clientId = config.clientId()
  if (!clientId || !config.clientSecret()) return new Response(`${provider} sign-in is not configured.`, { status: 503 })
  const current = mode === 'link' ? await readSession(request) : null
  if (mode === 'link' && !current?.internalUserId) return new Response('Sign in before linking another provider.', { status: 401 })
  const verifier = random(48)
  const flow: SocialFlow = {
    provider,
    state: random(24),
    nonce: random(24),
    verifier,
    returnTo: safeLocalReturn(returnTo) ?? '/account',
    mode,
    linkUserId: current?.internalUserId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: socialCallback(new URL(request.url).origin, provider),
    scope: config.scope,
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: await challenge(verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  const db=lifecycleBindings().db
  await db.prepare(`INSERT INTO oauth_transactions(id,provider,state_hash,nonce_hash,pkce_challenge,mode,link_user_id,return_to,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),provider,await challenge(flow.state),await challenge(flow.nonce),await challenge(verifier),mode,flow.linkUserId??null,flow.returnTo,flow.expiresAt,Date.now()).run()
  const headers = new Headers({ Location: `${config.authorize}?${params}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' })
  headers.append('Set-Cookie', cookie(SOCIAL_FLOW_COOKIE, await seal(flow), 10 * 60))
  return new Response(null, { status: 302, headers })
}

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(decoder.decode(fromBase64url(part))) as T
}

async function verifyOidcToken(token: string, provider: SocialProvider, nonce: string): Promise<OidcClaims> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('invalid_id_token')
  const header = decodeJwtPart<{ alg?: unknown; kid?: unknown }>(parts[0])
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('invalid_id_token_header')
  const response = await fetch(socialProviders[provider].jwks, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('provider_keys_unavailable')
  const keys = (await response.json()) as { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> }
  const jwk = keys.keys?.find(key => key.kid === header.kid && (!key.alg || key.alg === 'RS256'))
  if (!jwk) throw new Error('provider_key_not_found')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromBase64url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`))
  if (!valid) throw new Error('invalid_id_token_signature')
  const claims = decodeJwtPart<OidcClaims>(parts[1])
  const clientId = socialProviders[provider].clientId()
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audience.includes(clientId) || claims.nonce !== nonce || typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) {
    throw new Error('invalid_id_token_claims')
  }
  if (provider === 'google' && claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') {
    throw new Error('invalid_id_token_issuer')
  }
  if (provider === 'microsoft') {
    if (typeof claims.tid !== 'string' || claims.iss !== `https://login.microsoftonline.com/${claims.tid}/v2.0`) {
      throw new Error('invalid_id_token_issuer')
    }
  }
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('invalid_id_token_subject')
  return claims
}

async function exchangeSocialCode(provider: SocialProvider, code: string, verifier: string, redirectUri: string) {
  const config = socialProviders[provider]
  const response = await fetch(config.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId(),
      client_secret: config.clientSecret(),
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })
  if (!response.ok) throw new Error(`token_exchange_${response.status}`)
  const tokens = await response.json() as { id_token?: unknown }
  if (typeof tokens.id_token !== 'string') throw new Error('missing_id_token')
  return tokens.id_token
}

async function stableUserId(ownerId: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(ownerId)))
  return `user_${base64url(digest).slice(0, 32)}`
}

async function persistSocialIdentity(provider: SocialProvider, subject: string, email: string | undefined, linkUserId?: string, verifiedClaims:Record<string,unknown>={}) {
  const db = lifecycleBindings().db
  const providerOwnerId = `${provider}:${subject}`
  const existing = await db.prepare(`SELECT user_id FROM auth_identities WHERE provider=? AND provider_subject=?`)
    .bind(provider,subject).first<{user_id:string}>()
  if (linkUserId && existing && existing.user_id !== linkUserId) throw new Error('identity_already_linked')
  const userId = linkUserId ?? existing?.user_id ?? await stableUserId(providerOwnerId)
  const now = Date.now()
  if (!existing && !linkUserId) {
    await db.prepare(`INSERT INTO users(id,owner_id,role,account_state,primary_email,created_at,updated_at)
      VALUES(?,?,'customer','active',?,?,?) ON CONFLICT(owner_id) DO UPDATE SET primary_email=COALESCE(excluded.primary_email,users.primary_email),updated_at=excluded.updated_at`)
      .bind(userId, providerOwnerId, email??null, now, now).run()
  }
  const user = await db.prepare(`SELECT owner_id,account_state FROM users WHERE id=?`).bind(userId)
    .first<{owner_id:string;account_state:string}>()
  if (!user || user.account_state === 'deleted' || user.account_state === 'restricted') throw new Error('account_unavailable')
  await db.prepare(`UPDATE users SET primary_email=COALESCE(?,primary_email),updated_at=? WHERE id=?`).bind(email??null,now,userId).run()
  await db.prepare(`INSERT INTO auth_identities(id,user_id,provider,provider_subject,provider_email,email_verified,verified_claims_json,created_at,updated_at)
    VALUES(?,?,?,?,?,1,?,?,?) ON CONFLICT(provider,provider_subject) DO UPDATE SET provider_email=excluded.provider_email,email_verified=1,verified_claims_json=excluded.verified_claims_json,updated_at=excluded.updated_at`)
    .bind(`identity_${provider}_${(await stableUserId(subject)).slice(5)}`, userId, provider, subject, email ?? null, JSON.stringify(verifiedClaims), now, now).run()
  await db.prepare(`INSERT INTO customers(id,user_id,email,phone,transactional_contact_basis,marketing_consent,privacy_request_state,created_at,updated_at)
    VALUES(?,?,?,NULL,'contract',0,'none',?,?) ON CONFLICT(user_id) DO UPDATE SET email=COALESCE(excluded.email,customers.email),updated_at=excluded.updated_at`)
    .bind(`customer_${userId.slice(5)}`, userId, email ?? null, now, now).run()
  if (linkUserId && !existing) {
    const summary = JSON.stringify({ provider, outcome: 'linked' })
    await db.prepare(`INSERT INTO identity_security_events(id,actor_user_id,action,provider,provider_subject,summary_json,created_at)
      VALUES(?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),userId,'identity_linked',provider,subject,summary,now).run()
    await db.prepare(`INSERT INTO admin_audit_log(id,actor_user_id,action,target_type,target_id,summary_json,created_at)
      VALUES(?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),userId,'identity.linked','user',userId,summary,now).run()
  }
  return { userId, ownerId: user.owner_id }
}

export async function finishSocialOAuth(request: Request, provider: SocialProvider): Promise<Response> {
  if(!await allowRequest(request,'oauth_callback',20,10*60*1000))return new Response('Too many callback attempts. Try again shortly.',{status:429,headers:{'Retry-After':'600'}})
  const url = new URL(request.url)
  const flow = await open<SocialFlow>(cookies(request)[SOCIAL_FLOW_COOKIE])
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.has('error') || !flow || flow.provider !== provider || flow.expiresAt < Date.now() || !code || state !== flow.state) {
    return socialRedirect('/login?error=oauth_flow')
  }
  try {
    const db=lifecycleBindings().db
    const consumed=await db.prepare(`UPDATE oauth_transactions SET consumed_at=? WHERE provider=? AND state_hash=? AND consumed_at IS NULL AND expires_at>=?`)
      .bind(Date.now(),provider,await challenge(flow.state),Date.now()).run()
    if((consumed.meta.changes??0)!==1)throw new Error('oauth_transaction_invalid')
    const idToken = await exchangeSocialCode(provider, code, flow.verifier, socialCallback(url.origin, provider))
    const claims = await verifyOidcToken(idToken, provider, flow.nonce)
    const subject = claims.sub as string
    const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : typeof claims.preferred_username === 'string' ? claims.preferred_username.toLowerCase() : undefined
    const name = typeof claims.name === 'string' ? claims.name : undefined
    const previous = await readSession(request)
    if (flow.mode === 'link' && (!previous?.internalUserId || previous.internalUserId !== flow.linkUserId)) throw new Error('link_session_changed')
    const identity = await persistSocialIdentity(provider, subject, email, flow.linkUserId,{issuer:claims.iss,audience:claims.aud,emailVerified:claims.email_verified,tenant:claims.tid})
    const session: SessionData = {
      accessToken: '',
      refreshToken: '',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      user: { id: identity.ownerId, name, username: email, email, provider },
      csrf: previous?.csrf ?? random(24),
      internalUserId: identity.userId,
    }
    if (flow.mode === 'link') await revokeSession(previous)
    const headers = new Headers({ Location: flow.returnTo, 'Cache-Control': 'no-store' })
    headers.append('Set-Cookie', await databaseSessionCookie(session, identity.userId))
    headers.append('Set-Cookie', cookie(SEALED_SESSION_COOKIE, '', 0))
    headers.append('Set-Cookie', cookie(SOCIAL_FLOW_COOKIE, '', 0))
    return new Response(null, { status: 302, headers })
  } catch (error) {
    console.warn(`offscroll_oauth_failed:${error instanceof Error ? error.message : 'unknown'}`)
    return socialRedirect('/login?error=oauth_callback')
  }
}

function socialRedirect(location: string): Response {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', cookie(SOCIAL_FLOW_COOKIE, '', 0))
  return new Response(null, { status: 302, headers })
}

export const testing = { seal, open, safeLocalReturn, verifyOidcToken, socialCallback, databaseSessionCookie, persistSocialIdentity }
