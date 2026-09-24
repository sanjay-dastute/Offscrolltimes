import { createFileRoute } from '@tanstack/react-router'
import { recordBrowserAnalytics } from '#/lib/analytics.server'
export const Route = createFileRoute('/api/analytics')({ server: { handlers: { POST: ({ request }) => recordBrowserAnalytics(request) } } })

