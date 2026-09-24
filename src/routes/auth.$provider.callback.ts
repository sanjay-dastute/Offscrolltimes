import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { finishSocialOAuth, isSocialProvider } from '#/lib/auth.server'

export const Route = createFileRoute('/auth/$provider/callback')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isSocialProvider(params.provider)) return new Response('Provider not found.', { status: 404 })
        return finishSocialOAuth(request, params.provider)
      },
    },
  },
})
