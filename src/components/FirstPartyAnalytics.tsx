import { useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

type Choice = 'accepted'|'declined'|null
const key = 'offscroll_analytics_choice'

function send(event: string, path: string, value?: string) {
  void fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ event, path, value, consent: true }) })
}

export function FirstPartyAnalytics() {
  const location = useLocation()
  const [choice, setChoice] = useState<Choice>(null)
  useEffect(() => { setChoice(localStorage.getItem(key) as Choice) }, [])
  useEffect(() => { if (choice === 'accepted') send('page_view', location.pathname) }, [choice, location.pathname])
  useEffect(() => {
    if (choice !== 'accepted') return
    const click = (event: MouseEvent) => { const link = (event.target as Element | null)?.closest('a'); if (link?.getAttribute('href')?.startsWith('/checkout/')) send('checkout_started', location.pathname) }
    const duration = (event: Event) => { const target = event.target as HTMLElement; const value = target.getAttribute('data-analytics-duration') ?? (target.closest('[data-analytics-duration]') as HTMLElement | null)?.dataset.analyticsDuration; if (value) send('duration_selected', location.pathname, value) }
    document.addEventListener('click', click); document.addEventListener('change', duration)
    return () => { document.removeEventListener('click', click); document.removeEventListener('change', duration) }
  }, [choice, location.pathname])
  const decide = (next: Exclude<Choice,null>) => { localStorage.setItem(key, next); setChoice(next) }
  if (choice) return null
  return <aside role="dialog" aria-label="Analytics preference" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-2xl rounded-2xl border-2 border-graphite bg-paper-raised p-4 shadow-xl"><p className="m-0 text-sm"><strong>Help us improve?</strong> Allow anonymous, first-party page and subscription-funnel measurement. No advertising trackers, coupon codes or personal details are collected. Essential operational reporting continues either way. <a href="/policies/cookies">Cookie details</a></p><div className="mt-3 flex gap-2"><button onClick={()=>decide('accepted')} className="rounded-full bg-graphite px-4 py-2 text-sm text-paper">Allow analytics</button><button onClick={()=>decide('declined')} className="rounded-full border border-graphite px-4 py-2 text-sm">Decline</button></div></aside>
}
