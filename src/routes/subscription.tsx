import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '#/components/SiteHeader'
import { SubscriptionConfigurator } from '#/components/SubscriptionConfigurator'
import { SubscriptionHero } from '#/components/subscription'
import { SiteFooter } from '#/components/Faq'
import { BRAND_NAME } from '#/content/site'

export const Route = createFileRoute('/subscription')({
  head: () => ({
    meta: [
      { title: `Subscription plans | ${BRAND_NAME}` },
      {
        name: 'description',
        content:
          'Offscroll Times plans from INR 159 per month, with free delivery across India and manual renewal.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://offscrolltimes.com/subscription' }],
  }),
  component: SubscriptionPage,
})

function SubscriptionPage() {
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
        <SubscriptionHero />
        <SubscriptionConfigurator />
      </main>

      <SiteFooter />
    </>
  )
}
