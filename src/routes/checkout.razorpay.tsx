import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { CTA, H2 } from '#/lib/uiKit'

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void; on(event: 'payment.failed', callback: (response: unknown) => void): void } } }
type State = 'form' | 'creating' | 'paying' | 'verifying' | 'success' | 'failed' | 'cancelled'
type Quote = { currency: string; subtotalMinor: number; durationDiscountMinor: number; offerDiscountMinor: number; shippingMinor: number; taxMinor: number; totalMinor: number }
const money = (minor: number, currency: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(minor / 100)

export const Route = createFileRoute('/checkout/razorpay')({
  validateSearch: (search: Record<string, unknown>) => ({ duration: Math.max(1, Number(search.duration ?? 1) || 1), quantity: Math.max(1, Number(search.quantity ?? 1) || 1), country: typeof search.country === 'string' ? search.country : 'IN', code: typeof search.code === 'string' ? search.code : '' }),
  component: RazorpayCheckout,
})

function RazorpayCheckout() {
  const search = Route.useSearch()
  const [state, setState] = useState<State>('form'), [csrf, setCsrf] = useState(''), [quote, setQuote] = useState<Quote | null>(null), [error, setError] = useState('')
  const idempotencyKey = useRef(crypto.randomUUID())
  useEffect(() => {
    void fetch('/api/session').then(async response => (await response.json()) as { csrf?: string }).then(result => setCsrf(result.csrf ?? ''))
    void fetch(`/api/pricing?duration=${search.duration}&quantity=${search.quantity}&country=${encodeURIComponent(search.country)}&code=${encodeURIComponent(search.code)}`).then(async response => ({ response, result: await response.json() as { quote?: Quote; error?: string } })).then(({ response, result }) => response.ok && result.quote ? setQuote(result.quote) : setError(result.error ?? 'Pricing is unavailable.')).catch(() => setError('Pricing is unavailable. Please retry.'))
    const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true; document.head.appendChild(script)
    return () => { script.remove() }
  }, [search.code, search.country, search.duration, search.quantity])
  async function send(action: 'create' | 'verify' | 'record_state', body: Record<string, unknown>) {
    const response = await fetch('/api/razorpay/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, csrf, ...body }) })
    const result = await response.json() as Record<string, unknown>
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Payment request failed.')
    return result
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!csrf) { location.assign(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`); return }
    setState('creating'); setError(''); const form = new FormData(event.currentTarget); form.set('country',search.country); const address = Object.fromEntries(['name', 'line1', 'line2', 'city', 'region', 'postalCode', 'country'].map(key => [key, form.get(key)]))
    try {
      const order = await send('create', { idempotencyKey: idempotencyKey.current, durationMonths: search.duration, quantity: search.quantity, discountCode: search.code, email: form.get('email'), phone: form.get('phone'), address, acceptTerms: form.get('terms') === 'on' })
      if (!window.Razorpay) throw new Error('Secure payment window did not load. Please retry.')
      setState('paying')
      const checkout = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId, name: 'Offscroll Times', description: `${search.duration}-month subscription · ${search.quantity} copies`, prefill: { name: form.get('name'), email: form.get('email'), contact: form.get('phone') }, theme: { color: '#f6c945' }, modal: { ondismiss: () => { void send('record_state', { orderId: order.orderId, paymentState: 'cancelled' }).catch(() => undefined); setState('cancelled') } }, handler: async (payment: Record<string, string>) => { setState('verifying'); try { const verified = await send('verify', payment); if (verified.status !== 'captured') throw new Error('Payment is awaiting capture. Check your account in a moment.'); setState('success') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Payment verification failed.'); setState('failed') } } })
      checkout.on('payment.failed', () => { setError('Payment failed. No subscription has been activated. Please try again.'); setState('failed') }); checkout.open()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Payment could not be started.'); setState('failed') }
  }
  if (state === 'success') return <><SiteHeader /><main className="mx-auto max-w-2xl px-5 py-24 text-center"><h1 className={H2}>Payment confirmed.</h1><p className="mt-4">Your subscription is active. Your receipt and expected dispatch are available in your account.</p><a className={`${CTA} mt-7`} href="/account">View account</a></main><SiteFooter /></>
  return <><SiteHeader /><main className="checkout-page mx-auto max-w-5xl px-4 py-12 md:py-20"><h1 className={H2}>Secure checkout</h1><p className="mt-3 text-graphite-soft">Razorpay securely collects payment details. Offscroll Times never stores raw card information.</p><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"><form onSubmit={submit} className="grid gap-4 rounded-2xl border border-graphite bg-paper-raised p-6 md:grid-cols-2"><input required name="name" placeholder="Full name" autoComplete="name" className="rounded-xl border p-3" /><input required name="email" type="email" placeholder="Email" autoComplete="email" className="rounded-xl border p-3" /><input required name="phone" type="tel" placeholder="Phone number" autoComplete="tel" className="rounded-xl border p-3 md:col-span-2" /><input required name="line1" placeholder="Address line 1" autoComplete="address-line1" className="rounded-xl border p-3 md:col-span-2" /><input name="line2" placeholder="Address line 2 (optional)" autoComplete="address-line2" className="rounded-xl border p-3 md:col-span-2" /><input required name="city" placeholder="City / town" autoComplete="address-level2" className="rounded-xl border p-3" /><input required name="region" placeholder="State" autoComplete="address-level1" className="rounded-xl border p-3" /><input required name="postalCode" placeholder="PIN code" autoComplete="postal-code" className="rounded-xl border p-3" /><select required name="country" defaultValue="IN" className="rounded-xl border p-3"><option value="IN">India</option></select><label className="flex items-start gap-3 md:col-span-2"><input required name="terms" type="checkbox" className="mt-1" /><span>I accept the <a className="underline" href="/policies/subscription">subscription terms</a>, <a className="underline" href="/policies/refund">cancellation policy</a> and <a className="underline" href="/policies/privacy">privacy policy</a>.</span></label><button disabled={state === 'creating' || state === 'paying' || state === 'verifying'} className={`${CTA} md:col-span-2`}>{state === 'creating' ? 'Creating secure order…' : state === 'verifying' ? 'Verifying payment…' : 'Continue to Razorpay'}</button>{error && <p role="alert" className="text-red-700 md:col-span-2">{error}</p>}{['failed', 'cancelled'].includes(state) && <button type="button" className="underline md:col-span-2" onClick={() => setState('form')}>Return and retry safely</button>}</form><aside className="rounded-2xl border-2 border-graphite bg-sun p-6"><h2 className="text-2xl font-bold">Order summary</h2><dl className="mt-5 grid gap-3"><div className="flex justify-between"><dt>Duration</dt><dd>{search.duration} months</dd></div><div className="flex justify-between"><dt>Copies each month</dt><dd>{search.quantity}</dd></div>{quote && <><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotalMinor, quote.currency)}</dd></div><div className="flex justify-between"><dt>Discount</dt><dd>−{money(quote.durationDiscountMinor + quote.offerDiscountMinor, quote.currency)}</dd></div><div className="flex justify-between"><dt>Delivery</dt><dd>{money(quote.shippingMinor, quote.currency)}</dd></div><div className="flex justify-between"><dt>Tax</dt><dd>{money(quote.taxMinor, quote.currency)}</dd></div><div className="flex justify-between border-t pt-3 text-lg font-bold"><dt>Payable</dt><dd>{money(quote.totalMinor, quote.currency)}</dd></div></>}</dl></aside></div></main><SiteFooter /></>
}
