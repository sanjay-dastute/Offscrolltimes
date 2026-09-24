import { readSession, type SessionData } from '#/lib/auth.server'

export function isAdministratorUserId(userId: string): boolean {
  const configured = process.env.ADMIN_IDENTITY_IDS ?? ''
  return configured.split(',').map(value => value.trim()).filter(Boolean).includes(userId)
}

export async function readAdministratorSession(request: Request): Promise<SessionData | null> {
  const session = await readSession(request)
  return session && isAdministratorUserId(session.user.id) ? session : null
}
