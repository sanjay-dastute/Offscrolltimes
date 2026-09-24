import { createFileRoute } from '@tanstack/react-router'
import { razorpayWebhook } from '#/lib/razorpay.endpoint.server'
export const Route=createFileRoute('/api/webhooks/razorpay')({server:{handlers:{POST:({request})=>razorpayWebhook(request)}}})
