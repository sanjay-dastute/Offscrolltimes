import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { BRAND_NAME, FAQ_GROUPS } from '#/content/site'

export const Route = createFileRoute('/faq')({
  head: () => ({
    meta: [
      { title: `Frequently asked questions | ${BRAND_NAME}` },
      {
        name: 'description',
        content: `Delivery, billing, cancellations and what's inside every issue of ${BRAND_NAME}.`,
      },
    ],
  }),
  component: FaqPage,
})

function Cross() {
  return (
    <span
      aria-hidden="true"
      className="accordion-cross relative ml-auto h-4 w-4 shrink-0 transition-transform duration-150"
    >
      <span className="absolute top-[7px] left-0 h-0.5 w-4 bg-founder-deep" />
      <span className="absolute top-0 left-[7px] h-4 w-0.5 bg-founder-deep" />
    </span>
  )
}

function FaqPage() {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const groups = FAQ_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !normalizedQuery ||
        item.q.toLowerCase().includes(normalizedQuery) ||
        item.a.toLowerCase().includes(normalizedQuery) ||
        group.title.toLowerCase().includes(normalizedQuery),
    ),
  })).filter((group) => group.items.length > 0)
  const resultCount = groups.reduce((total, group) => total + group.items.length, 0)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[920px] px-4 py-16 sm:px-6 md:py-24">
        <p className="m-0 mb-5 font-mono text-[11.5px] tracking-[0.16em] text-graphite-mute uppercase">
          FAQ
        </p>
        <h1 className="m-0 mb-8 font-display text-[clamp(1.9rem,4.6vw,3.1rem)] leading-[1.02] font-bold tracking-[-0.03em] md:mb-11">
          Everything you might want to know.
        </h1>

        <label htmlFor="faq-search" className="font-mono text-[11px] font-bold tracking-[0.1em] text-graphite-mute uppercase">
          Search questions and answers
        </label>
        <div className="relative mt-2">
          <input id="faq-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “address”, “refund” or “Europe”" className="w-full rounded-2xl border-2 border-graphite bg-paper-raised px-5 py-4 pr-24 text-[16px] shadow-[5px_5px_0_rgba(23,21,18,0.12)]" />
          {query && <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-4 -translate-y-1/2 border-0 bg-transparent font-mono text-[10px] font-bold tracking-[0.06em] uppercase underline">Clear</button>}
        </div>
        <p aria-live="polite" className="mt-3 font-mono text-[10.5px] tracking-[0.06em] text-graphite-mute uppercase">{resultCount} {resultCount === 1 ? 'answer' : 'answers'} found</p>

        <div className="mt-10 flex flex-col gap-11">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`faq-${group.key}`}>
              <h2 id={`faq-${group.key}`} className="m-0 mb-4 font-display text-[clamp(1.45rem,3vw,2rem)] font-bold tracking-[-0.025em]">{group.title}</h2>
              <div className="rounded-2xl border border-graphite bg-paper-raised px-6">
                {group.items.map((item, index) => (
                  <details key={item.q} className={index === group.items.length - 1 ? "" : "border-b border-rule"}>
                    <summary className="flex min-h-14 items-center gap-5 py-5 font-display text-[clamp(1.05rem,2vw,1.25rem)] font-bold tracking-[-0.015em]">
                      <span>{item.q}</span><Cross />
                    </summary>
                    <div className="faq-answer"><p className="m-0 mb-6 max-w-[68ch] leading-relaxed text-graphite-soft">{item.a}</p></div>
                  </details>
                ))}
              </div>
            </section>
          ))}
          {resultCount === 0 && <div className="rounded-2xl border border-graphite bg-sun p-7"><h2 className="m-0 font-display text-[1.35rem] font-bold">No matching answer yet.</h2><p className="m-0 mt-2 text-graphite-soft">Try a shorter search or contact us and we will help.</p><a href="/contact" className="mt-4 inline-block font-mono text-[11px] font-bold uppercase underline">Contact support</a></div>}
        </div>

        <a
          href="/subscription#plans"
          className="mt-9 inline-block rounded-full border border-graphite bg-graphite px-7 py-4 font-mono text-[13px] font-bold tracking-[0.1em] text-paper uppercase no-underline hover:bg-sun hover:text-graphite"
        >
          Start a subscription
        </a>
      </main>
      <SiteFooter />
    </>
  )
}
