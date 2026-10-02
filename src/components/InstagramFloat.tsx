import { INSTAGRAM_URL } from '#/content/site'

export function InstagramIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
}

export function InstagramFloat() {
  return <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow Offscroll Times on Instagram" className="instagram-float instagram-glow fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-graphite text-white transition-transform hover:scale-105 print:hidden" style={{bottom:'calc(var(--whatsapp-float-offset, 1.25rem) + 4.25rem + env(safe-area-inset-bottom, 0px))'}}><InstagramIcon /></a>
}
