import { createHmac, timingSafeEqual } from 'node:crypto'

function credentials() {
  const keyId=process.env.RAZORPAY_KEY_ID, keySecret=process.env.RAZORPAY_KEY_SECRET
  if(!keyId||!keySecret) throw new Error('Razorpay is not configured.')
  return {keyId,keySecret}
}

export class RazorpayApiError extends Error {
  constructor(public readonly status: number) { super(`Razorpay request failed (${status}).`) }
}

export function razorpayPublicKey(){ return credentials().keyId }

async function api(path:string,init:RequestInit={}) {
  const {keyId,keySecret}=credentials()
  try {
    const response=await fetch(`https://api.razorpay.com/v1${path}`,{...init,headers:{Authorization:`Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,'Content-Type':'application/json',...(init.headers??{})}})
    if(!response.ok) throw new RazorpayApiError(response.status)
    return response.json() as Promise<Record<string,any>>
  } catch (error) {
    if (error instanceof RazorpayApiError) throw error
    console.error('razorpay_api_transport_failed', { path, name: error instanceof Error ? error.name : 'UnknownError', message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
    throw new RazorpayApiError(502)
  }
}

export async function createRazorpayOrder(input:{amount:number;currency:string;receipt:string;notes:Record<string,string>}) {
  if(!Number.isSafeInteger(input.amount)||input.amount<100) throw new RangeError('Order amount must be at least 100 paise.')
  return api('/orders',{method:'POST',body:JSON.stringify(input)})
}

export async function createRazorpayPlan(input:{period:'monthly'|'yearly';interval:number;amount:number;currency:string;name:string;description:string;notes:Record<string,string>}) {
  if(!Number.isSafeInteger(input.amount)||input.amount<100) throw new RangeError('Subscription amount must be at least 100 in the smallest currency unit.')
  if(!Number.isSafeInteger(input.interval)||input.interval<1) throw new RangeError('A valid billing interval is required.')
  return api('/plans',{method:'POST',body:JSON.stringify({period:input.period,interval:input.interval,item:{name:input.name,amount:input.amount,currency:input.currency,description:input.description},notes:input.notes})})
}

export async function createRazorpaySubscription(input:{planId:string;totalCount:number;notes:Record<string,string>}) {
  if(!input.planId||!Number.isSafeInteger(input.totalCount)||input.totalCount<1) throw new RangeError('A valid subscription plan and billing-cycle count are required.')
  return api('/subscriptions',{method:'POST',body:JSON.stringify({plan_id:input.planId,total_count:input.totalCount,quantity:1,customer_notify:false,notes:input.notes})})
}

export async function cancelRazorpaySubscription(subscriptionId:string) {
  if(!subscriptionId) throw new RangeError('A Razorpay subscription id is required.')
  return api(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,{method:'POST',body:JSON.stringify({cancel_at_cycle_end:1})})
}

export async function retrieveRazorpayPayment(id:string){ return api(`/payments/${encodeURIComponent(id)}`) }

export async function createRazorpayRefund(paymentId:string, amount:number, notes:Record<string,string>={}) {
  if(!paymentId || !Number.isSafeInteger(amount) || amount < 1) throw new RangeError('A valid payment and refund amount are required.')
  return api(`/payments/${encodeURIComponent(paymentId)}/refund`, { method:'POST', body:JSON.stringify({amount,notes}) })
}

function signature(secret:string,payload:string,received:string){
  const expected=createHmac('sha256',secret).update(payload).digest('hex')
  const a=Buffer.from(expected),b=Buffer.from(received)
  return a.length===b.length&&timingSafeEqual(a,b)
}

export function verifyCheckoutSignature(orderId:string,paymentId:string,received:string){ return signature(credentials().keySecret,`${orderId}|${paymentId}`,received) }
export function verifySubscriptionSignature(subscriptionId:string,paymentId:string,received:string){ return signature(credentials().keySecret,`${paymentId}|${subscriptionId}`,received) }
export function verifyWebhookSignature(raw:string,received:string){ const secret=process.env.RAZORPAY_WEBHOOK_SECRET; return Boolean(secret&&signature(secret,raw,received)) }
