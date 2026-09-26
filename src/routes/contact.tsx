import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { EnquiryCards, ContactForm } from '#/components/contact'
import {
  BRAND_NAME,
  CONTACT_EMAIL,
  ENQUIRY_TYPES,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
  whatsappEnquiryMessage,
} from '#/content/site'
import { EYEBROW, H2, SHELL } from '#/lib/uiKit'

export const Route = createFileRoute('/contact')({
  head: () => ({
    meta: [
      { title: `Contact us | ${BRAND_NAME}` },
      {
        name: 'description',
        content:
          'Reach Offscroll Times for general enquiries, subscription support, bulk orders or partnerships — by form, email or WhatsApp.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://offscrolltimes.com/contact' }],
  }),
  component: ContactPage,
})

type EnquiryKey = (typeof ENQUIRY_TYPES)[number]['key']

function WhatsAppQuickButton() {
  const [country, setCountry] = useState('')
  const href = `${WHATSAPP_URL.split('?')[0]}?text=${encodeURIComponent(whatsappEnquiryMessage(country))}`

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-graphite bg-paper-raised p-6">
      <label className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] tracking-[0.06em] text-graphite-mute uppercase">
          Your country
        </span>
        <input
          type="text"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          placeholder="e.g. India"
          className="w-40 rounded-full border border-graphite bg-paper px-4 py-2 text-right text-[13px] text-graphite outline-none placeholder:text-graphite-mute"
        />
      </label>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-graphite bg-[#25D366] px-6 py-3.5 font-mono text-[12.5px] font-bold tracking-[0.08em] text-paper uppercase no-underline"
      >
        Message us on WhatsApp
      </a>
      <p className="m-0 text-[12px] leading-relaxed text-graphite-soft">
        Opens WhatsApp with: &ldquo;{whatsappEnquiryMessage(country)}&rdquo;
      </p>
    </div>
  )
}

function ContactPage() {
  const [enquiryType, setEnquiryType] = useState<EnquiryKey>('general')

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
        <section className="bg-paper">
          <div className={`${SHELL} py-14 md:py-20`}>
            <p className={`${EYEBROW} text-graphite-mute`}>Contact</p>
            <h1 className={`${H2} max-w-[18ch]`}>How can we help?</h1>
            <p className="mt-5 max-w-[60ch] leading-relaxed text-graphite-soft">
              Pick what this is about, then reach us by form, email or WhatsApp — whichever is
              faster for you.
            </p>
          </div>
        </section>

        <section id="enquiry-form" className="border-b border-graphite bg-paper scroll-mt-24">
          <div className={`${SHELL} py-14 md:py-20`}>
            <EnquiryCards selected={enquiryType} onSelect={setEnquiryType} />
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <ContactForm enquiryType={enquiryType} onEnquiryTypeChange={setEnquiryType} />

              <div className="flex flex-col gap-8">
                <div>
                  <p className={`${EYEBROW} text-graphite-mute`}>Email</p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[15px] underline">
                    {CONTACT_EMAIL}
                  </a>
                </div>

                <div>
                  <p className={`${EYEBROW} text-graphite-mute`}>WhatsApp</p>
                  <p className="m-0 mb-3 leading-relaxed text-graphite-soft">{WHATSAPP_NUMBER}</p>
                  <WhatsAppQuickButton />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
