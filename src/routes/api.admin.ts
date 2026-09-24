import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { getAdmin, mutateAdmin } from '#/lib/admin/endpoint.server'

export const Route = createFileRoute('/api/admin')({
  server: { handlers: { GET: ({ request }) => getAdmin(request), POST: ({ request }) => mutateAdmin(request) } },
})
