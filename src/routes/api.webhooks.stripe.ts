import {createFileRoute} from '@tanstack/react-router'
import {stripeWebhook} from '#/lib/stripe.endpoint.server'
export const Route=createFileRoute('/api/webhooks/stripe')({server:{handlers:{POST:({request})=>stripeWebhook(request)}}})
