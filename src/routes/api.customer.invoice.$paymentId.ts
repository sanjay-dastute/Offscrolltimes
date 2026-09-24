import { createFileRoute } from '@tanstack/react-router'
import { customerInvoice } from '#/lib/razorpay.endpoint.server'
export const Route=createFileRoute('/api/customer/invoice/$paymentId')({server:{handlers:{GET:({request,params})=>customerInvoice(request,params.paymentId)}}})
