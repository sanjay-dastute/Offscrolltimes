import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '#/components/SiteHeader'
import {
  Hero,
  HowItWorks,
  FinalCta,
  Plans,
  ProductPreview,
  Testimonials,
  WhatsInside,
  WhoFor,
  WhyLove,
  ScrollComparison,
} from '#/components/sections'
import { Faq, SiteFooter } from '#/components/Faq'
import { PaperPlayground } from '#/components/PaperPlayground'

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

      <main id="main-content" className="paper-sections">
        <Hero />
        <PaperPlayground />
        <WhatsInside />
        <ProductPreview />
        <WhyLove />
        <ScrollComparison />
        <HowItWorks />
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
