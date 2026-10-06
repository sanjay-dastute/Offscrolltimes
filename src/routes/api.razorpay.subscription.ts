import { createFileRoute } from '@tanstack/react-router'
import { razorpaySubscriptionCheckout } from '#/lib/razorpay-subscription.endpoint.server'

export const Route = createFileRoute('/api/razorpay/subscription')({
  server: { handlers: { POST: ({ request }) => razorpaySubscriptionCheckout(request) } },
})
