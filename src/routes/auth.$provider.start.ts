import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { beginSocialOAuth, isSocialProvider } from '#/lib/auth.server'

export const Route = createFileRoute('/auth/$provider/start')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isSocialProvider(params.provider)) return new Response('Provider not found.', { status: 404 })
        const url = new URL(request.url)
        const returnTo = url.searchParams.get('return_to') ?? undefined
        const mode = url.searchParams.get('mode') === 'link' ? 'link' : 'login'
        return beginSocialOAuth(request, params.provider, returnTo, mode)
      },
    },
  },
})
