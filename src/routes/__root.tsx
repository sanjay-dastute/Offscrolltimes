import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'
import { EnvelopeReveal } from '#/components/EnvelopeReveal'
import { FirstPartyAnalytics } from '#/components/FirstPartyAnalytics'
import { PaperAtmosphere } from '#/components/PaperAtmosphere'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { CTA, CTA_OUTLINE, EYEBROW, SHELL } from '#/lib/uiKit'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Offscroll Times: A monthly puzzle newspaper, delivered',
      },
      {
        name: 'description',
        content:
          "Offscroll Times is a monthly newspaper of crosswords, brain teasers, family games and local trivia, with free delivery across India. No screens required.",
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Offscroll Times: A monthly puzzle newspaper, delivered' },
      { property: 'og:description', content: 'Crosswords, brain teasers, family games and regional trivia delivered monthly across India.' },
      { property: 'og:image', content: '/images/about-print-shop.jpg' },
      { name: 'theme-color', content: '#f4b541' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Offscroll Times' },
      { name: 'twitter:description', content: 'A screen-free monthly puzzle newspaper delivered to your door.' },
    ],
    links: [
      { rel: 'icon', href: '/offscroll-times-logo.jpeg', type: 'image/jpeg' },
      { rel: 'apple-touch-icon', href: '/offscroll-times-logo.jpeg' },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function NotFoundPage() {
  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <SiteHeader />
    <main id="main-content" className={`${SHELL} min-h-[60vh] py-20 text-center`}>
      <p className={EYEBROW}>404 · Missing page</p>
      <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] font-bold leading-tight">This page is out of print.</h1>
      <p className="mx-auto mt-6 max-w-lg text-lg text-graphite-soft">We couldn't find the page you requested. The link may be outdated, or the address may contain a typo.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <a href="/" className={CTA}>Back to home</a>
        <a href="/contact" className={CTA_OUTLINE}>Contact us</a>
      </div>
    </main>
    <SiteFooter />
  </>
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({
          '@context':'https://schema.org','@type':'Product',name:'Offscroll Times',
          description:'A monthly physical puzzle newspaper with free delivery across India.',
          category:'Printed puzzle newspaper',brand:{'@type':'Brand',name:'Offscroll Times'},
        })}} />
        <EnvelopeReveal />
        <FirstPartyAnalytics />
        <PaperAtmosphere />
        {children}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
