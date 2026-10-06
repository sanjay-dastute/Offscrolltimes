import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import type { PublicAnswerSheet } from '#/routes/api.answers'

export const Route=createFileRoute('/offlimits')({
  head:()=>({meta:[{title:'OFFLIMITS | Offscroll Times'},{name:'description',content:'Official answer sheets for Offscroll Times puzzle newspaper editions.'}]}),
  component:OfflimitsPage,
})

function formatDate(value:string){
  const date=new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date)
}

function OfflimitsPage(){
  const [answers,setAnswers]=useState<PublicAnswerSheet[]>([]),[state,setState]=useState<'loading'|'ready'|'error'>('loading')
  useEffect(()=>{void fetch('/api/answers').then(async response=>{if(!response.ok)throw new Error();const result=await response.json() as {answers:PublicAnswerSheet[]};setAnswers(result.answers);setState('ready')}).catch(()=>setState('error'))},[])
  return <><SiteHeader/><main className="mx-auto min-h-[65vh] max-w-5xl px-4 py-14 sm:px-6 md:py-20">
    <p className="font-mono text-[11px] font-bold tracking-[0.18em] text-red-600 uppercase">OFFLIMITS</p>
    <h1 className="mt-4 font-display text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-[.9] tracking-[-.05em]">Solutions</h1>
    <p className="mt-7 max-w-[48ch] text-[clamp(1.1rem,2vw,1.38rem)] font-semibold leading-relaxed">Couldn&apos;t crack it? The answers are here. But you gave the paper a proper try first, right?</p>
    <section aria-label="Available answer sheets" className="mt-12 grid gap-4">
      {state==='loading'&&<p role="status" className="rounded-2xl border-2 border-graphite bg-paper-raised p-6">Loading answer sheets…</p>}
      {state==='error'&&<p role="alert" className="rounded-2xl border-2 border-graphite bg-paper-raised p-6">Answer sheets are unavailable at the moment. Please try again shortly.</p>}
      {state==='ready'&&!answers.length&&<p className="rounded-2xl border-2 border-graphite bg-paper-raised p-6">No answer sheets have been published yet. Check back after the next edition.</p>}
      {answers.map(answer=><article key={answer.assetId} className="flex flex-col gap-5 rounded-2xl border-2 border-graphite bg-paper-raised p-5 shadow-[5px_5px_0_#171512] sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><h2 className="font-display text-2xl font-bold uppercase">Issue {answer.issueNumber}</h2><p className="mt-1 font-mono text-[11px] tracking-[.08em] text-graphite-soft uppercase">{formatDate(answer.issueDate)}</p></div><a href={`/api/assets/${answer.assetId}`} className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-graphite bg-[#ff392e] px-5 py-3 font-mono text-[11px] font-bold tracking-[.06em] text-white uppercase no-underline hover:bg-sun hover:text-graphite focus-visible:ring-2 focus-visible:ring-founder-deep" download>Download answers</a></article>)}
    </section>
  </main><SiteFooter/></>
}
