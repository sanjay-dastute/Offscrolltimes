import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { WHATSAPP_URL } from '#/content/site'

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..')
const source=(relative:string)=>readFileSync(path.join(root,relative),'utf8')

describe('UI accessibility contracts',()=>{
  it('provides global keyboard focus, skip-link and reduced-motion behavior',()=>{
    const css=source('styles.css')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('.skip-link:focus')
    expect(css).toContain('prefers-reduced-motion:reduce')
    expect(css).toContain('animation:none!important')
  })
  it('gives modal experiences names, modality, escape handling and focus management',()=>{
    const envelope=source('components/EnvelopeReveal.tsx'),analytics=source('components/FirstPartyAnalytics.tsx')
    expect(envelope).toContain('role="dialog"')
    expect(envelope).toContain('aria-modal="true"')
    expect(envelope).toContain("event.key==='Tab'")
    expect(analytics).toContain('role="dialog"')
    expect(analytics).toContain('aria-label="Analytics preference"')
  })
  it('exposes navigation landmarks, labelled controls and live error/status messages',()=>{
    const header=source('components/SiteHeader.tsx'),account=source('routes/account.tsx'),faq=source('routes/faq.tsx'),admin=source('routes/admin.tsx')
    expect(header).toContain('aria-label="Primary"')
    expect(header).toContain('aria-label="Mobile primary"')
    expect(account).toContain('role="alert"')
    expect(account).toContain('role="status"')
    expect(faq).toContain('aria-live="polite"')
    expect(admin).toContain('<table')
    expect(admin).toContain('<th')
  })
  it('keeps WhatsApp links HTTPS, directly addressable and safely opened',()=>{
    const url=new URL(WHATSAPP_URL)
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('wa.me')
    expect(url.pathname).toMatch(/^\/\d+$/)
    expect(url.searchParams.get('text')).toContain('subscription')
    expect(source('components/WhatsAppFloat.tsx')).toContain('rel="noopener noreferrer"')
    expect(source('components/WhatsAppFloat.tsx')).toContain('WHATSAPP_URL.split("?")[0]')
  })
  it('contains explicit loading, empty, failed-request and retry states',()=>{
    const admin=source('routes/admin.tsx'),checkout=source('routes/checkout.razorpay.tsx'),account=source('routes/account.tsx')
    expect(admin).toContain("'loading'")
    expect(admin).toContain("'error'")
    expect(admin).toContain('No enquiries yet.')
    expect(checkout).toContain("'failed'")
    expect(checkout).toContain("'timeout'")
    expect(checkout).toContain('Return and retry safely')
    expect(account).toContain('role="alert"')
  })
})
