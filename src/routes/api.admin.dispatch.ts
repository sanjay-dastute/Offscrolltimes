import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { getDispatchCsv } from '#/lib/admin/endpoint.server'

export const Route = createFileRoute('/api/admin/dispatch')({
  server: { handlers: { GET: ({ request }) => getDispatchCsv(request) } },
})
