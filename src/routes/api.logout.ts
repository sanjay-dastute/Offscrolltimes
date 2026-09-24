import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { readSession, revokeSession, clearAuthCookies } from '#/lib/auth.server'
import { isSameOrigin } from '#/lib/security'

export const Route = createFileRoute('/api/logout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request)) return new Response('Forbidden', { status: 403 })
        await revokeSession(await readSession(request))
        const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' })
        for (const value of clearAuthCookies()) headers.append('Set-Cookie', value)
        return new Response(null, { status: 303, headers })
      },
    },
  },
})
