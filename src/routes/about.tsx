import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '#/components/SiteHeader'
import {
  AboutCta,
  AboutHero,
  BehindTheScenes,
  ProductionProcess,
  WhoWeAre,
  WhyUsAbout,
} from '#/components/about'
import { SiteFooter } from '#/components/Faq'
import { BRAND_NAME } from '#/content/site'

export const Route = createFileRoute('/about')({
  head: () => ({
    meta: [
      { title: `About us | ${BRAND_NAME}` },
      {
        name: 'description',
        content:
          "Who's behind Offscroll Times, why every issue is original and tested, and how an idea becomes a printed newspaper on your doorstep.",
      },
    ],
    links: [{ rel: 'canonical', href: 'https://offscrolltimes.com/about' }],
  }),
  component: AboutPage,
})

function AboutPage() {
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
        <AboutHero />
        <WhoWeAre />
        <WhyUsAbout />
        <ProductionProcess />
        <BehindTheScenes />
        <AboutCta />
      </main>

      <SiteFooter />
    </>
  )
}
