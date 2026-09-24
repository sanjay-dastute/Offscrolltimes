import { createFileRoute } from '@tanstack/react-router'
import { razorpayCheckout } from '#/lib/razorpay.endpoint.server'
export const Route=createFileRoute('/api/razorpay/checkout')({server:{handlers:{POST:({request})=>razorpayCheckout(request)}}})
