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
  const response=await fetch(`https://api.razorpay.com/v1${path}`,{...init,headers:{Authorization:`Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,'Content-Type':'application/json',...(init.headers??{})}})
  if(!response.ok) throw new RazorpayApiError(response.status)
  return response.json() as Promise<Record<string,any>>
}

export async function createRazorpayOrder(input:{amount:number;currency:string;receipt:string;notes:Record<string,string>}) {
  if(!Number.isSafeInteger(input.amount)||input.amount<100) throw new RangeError('Order amount must be at least 100 paise.')
  return api('/orders',{method:'POST',body:JSON.stringify(input)})
}

export async function retrieveRazorpayPayment(id:string){ return api(`/payments/${encodeURIComponent(id)}`) }

function signature(secret:string,payload:string,received:string){
  const expected=createHmac('sha256',secret).update(payload).digest('hex')
  const a=Buffer.from(expected),b=Buffer.from(received)
  return a.length===b.length&&timingSafeEqual(a,b)
}

export function verifyCheckoutSignature(orderId:string,paymentId:string,received:string){ return signature(credentials().keySecret,`${orderId}|${paymentId}`,received) }
export function verifyWebhookSignature(raw:string,received:string){ const secret=process.env.RAZORPAY_WEBHOOK_SECRET; return Boolean(secret&&signature(secret,raw,received)) }
