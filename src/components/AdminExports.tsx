import { useState } from 'react'
import { CTA,H2 } from '#/lib/uiKit'

export function AdminExports({editions}:{editions:Array<Record<string,unknown>>}){
  const eligible=editions.filter(edition=>['locked','dispatched','completed'].includes(String(edition.status??'')))
  const [editionId,setEditionId]=useState(String(eligible[0]?.id??''))
  return <section className="max-w-2xl"><h2 className={H2}>Delivery print list</h2><p className="mt-3 text-graphite-soft">This PDF contains only active paid subscriptions eligible for the selected edition: edition number, customer name, delivery address, phone, subscription status and end date. Inactive or unpaid records are excluded.</p>{eligible.length?<div className="mt-6 grid gap-4 rounded-2xl border border-graphite bg-paper p-6 sm:grid-cols-[1fr_auto]"><label className="grid gap-2"><span className="font-semibold">Locked edition</span><select value={editionId} onChange={event=>setEditionId(event.target.value)} className="rounded-xl border border-graphite bg-paper px-4 py-3">{eligible.map(edition=><option value={String(edition.id)} key={String(edition.id)}>Issue {String(edition.issue_number)} — {String(edition.label)}</option>)}</select></label><a className={`${CTA} self-end text-center`} href={`/api/admin/dispatch?edition=${encodeURIComponent(editionId)}&format=pdf`}>Download PDF</a></div>:<p className="mt-6 rounded-xl border border-graphite bg-sun/30 p-4">Lock an edition after reviewing its eligibility list to enable its delivery printout.</p>}</section>
}
