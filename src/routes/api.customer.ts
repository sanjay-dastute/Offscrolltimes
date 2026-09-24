import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { getCustomerDashboard, patchCustomerDashboard } from '#/lib/customer/endpoint.server'

export const Route = createFileRoute('/api/customer')({
  server: {
    handlers: {
      GET: ({ request }) => getCustomerDashboard(request),
      PATCH: ({ request }) => patchCustomerDashboard(request),
    },
  },
})
