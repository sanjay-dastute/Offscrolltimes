import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '#/components/SiteHeader'
import {
  Hero,
  HowItWorks,
  FinalCta,
  Plans,
  ProductPreview,
  Testimonials,
  SubscriptionPrompt,
  WhatsInside,
  WhoFor,
  WhyLove,
} from '#/components/sections'
import { Faq, SiteFooter } from '#/components/Faq'

export const Route = createFileRoute('/')({
  head: () => ({
    links: [{ rel: 'canonical', href: 'https://offscrolltimes.com/' }],
  }),
  component: Home,
})

function Home() {
  return (
    <>
      <a
        href="#main-content"
        className="skip-link border border-graphite bg-graphite px-4 py-3 font-mono text-[12px] uppercase tracking-[0.08em] text-paper no-underline"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main-content">
        <Hero />
        <WhatsInside />
        <ProductPreview />
        <WhyLove />
        <HowItWorks />
        <SubscriptionPrompt />
        <Plans />
        <WhoFor />
        <Testimonials />
        <Faq />
        <FinalCta />
      </main>

      <SiteFooter />
    </>
  )
}
