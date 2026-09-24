import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { WHATSAPP_URL } from '#/content/site'

export const Route = createFileRoute('/order-complete')({
  head: () => ({
    meta: [
      { title: 'Order complete | Offscroll Times' },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === 'string' ? search.status : undefined,
    payment_id: typeof search.payment_id === 'string' ? search.payment_id : undefined,
  }),
  component: OrderComplete,
})

function OrderComplete() {
  const { status, payment_id } = useSearch({ from: '/order-complete' })
  const [verified,setVerified]=useState(false)
  const failed=status==='failed'||status==='canceled'
  useEffect(()=>{if(!payment_id||failed)return;void fetch(`/api/customer/invoice/${encodeURIComponent(payment_id)}`,{headers:{Accept:'text/html'}}).then(response=>setVerified(response.ok))},[payment_id,failed])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[60vh] max-w-[720px] flex-col items-center gap-6 px-5 py-20 text-center md:py-28">
        {verified ? (
          <>
            <p className="m-0 font-mono text-[11.5px] font-bold tracking-[0.16em] text-founder-deep uppercase">
              Subscription confirmed
            </p>
            <h1 className="m-0 font-display text-[clamp(2rem,5.4vw,3rem)] leading-[1.02] font-bold tracking-[-0.03em]">
              Your first issue is on its way.
            </h1>
            <p className="m-0 max-w-[50ch] leading-relaxed text-graphite-soft">
              Razorpay verified your payment and your subscription is active. Your receipt and
              first-edition status are available in your account.
              {payment_id ? (
                <>
                  {' '}
                  Reference: <span className="font-mono text-[13px]">{payment_id}</span>.
                </>
              ) : null}
            </p>
          </>
        ) : failed ? (
          <>
            <p className="m-0 font-mono text-[11.5px] font-bold tracking-[0.16em] text-founder-deep uppercase">
              Payment not completed
            </p>
            <h1 className="m-0 font-display text-[clamp(2rem,5.4vw,3rem)] leading-[1.02] font-bold tracking-[-0.03em]">
              That payment did not go through.
            </h1>
            <p className="m-0 max-w-[50ch] leading-relaxed text-graphite-soft">
              No charge was made. You can try again from the plans below, or message us on
              WhatsApp if something looks wrong.
            </p>
          </>
        ) : <><p className="m-0 font-mono text-[11.5px] font-bold tracking-[0.16em] text-founder-deep uppercase">Verification pending</p><h1 className="m-0 font-display text-[clamp(2rem,5.4vw,3rem)] leading-[1.02] font-bold">We are confirming your payment.</h1><p className="m-0 max-w-[50ch] leading-relaxed text-graphite-soft">This page will show confirmation only after the server has a verified Razorpay payment. You can also check your account status.</p></>}

        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          {verified&&payment_id&&<a href={`/api/customer/invoice/${encodeURIComponent(payment_id)}`} className="text-[14.5px] font-bold underline">Download receipt</a>}
          {!failed&&<a href="/account" className="text-[14.5px] font-bold underline">View account status</a>}
          <a
            href="/#plans"
            className="stamp inline-block rounded-full border border-graphite bg-graphite px-7 py-4 font-mono text-[13px] font-bold tracking-[0.1em] text-paper uppercase no-underline hover:bg-sun hover:text-graphite"
          >
            Back to plans
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[14.5px] text-graphite-soft underline"
          >
            Message us on WhatsApp
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
