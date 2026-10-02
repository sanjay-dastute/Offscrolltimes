import {createFileRoute} from '@tanstack/react-router'
import {stripeCheckout} from '#/lib/stripe.endpoint.server'
export const Route=createFileRoute('/api/stripe/checkout')({server:{handlers:{POST:({request})=>stripeCheckout(request)}}})
