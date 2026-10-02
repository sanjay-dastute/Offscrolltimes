import { createHmac,timingSafeEqual } from 'node:crypto'
export async function stripeApi(path:string,params?:Record<string,string>,idempotencyKey?:string,configuredSecret?:string):Promise<Record<string,any>>{
  const secret=configuredSecret??process.env.STRIPE_SECRET_KEY
  if(!secret)throw new Error('Stripe is not configured.')
  const response=await fetch(`https://api.stripe.com/v1${path}`,{method:params?'POST':'GET',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${secret}`,'Stripe-Version':'2025-03-31.basil',...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:params?new URLSearchParams(params).toString():undefined})
  if(!response.ok)throw new Error(`Stripe request failed (${response.status}).`)
  return response.json() as Promise<Record<string,any>>
}
export function verifyStripeWebhook(raw:string,signature:string,now=Date.now()){
  const secret=process.env.STRIPE_WEBHOOK_SECRET
  if(!secret)return false
  const values=signature.split(','),timestamp=values.find(part=>part.startsWith('t='))?.slice(2)
  if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)return false
  const expected=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex')
  return values.filter(part=>part.startsWith('v1=')).some(part=>{const value=part.slice(3);return /^[a-f0-9]{64}$/.test(value)&&timingSafeEqual(Buffer.from(value),Buffer.from(expected))})
}
