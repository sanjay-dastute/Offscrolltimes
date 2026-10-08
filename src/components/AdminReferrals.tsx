import { useState } from 'react'
import { CTA, EYEBROW } from '#/lib/uiKit'

export function AdminReferrals({ basisPoints, busy, mutate }: { basisPoints:number; busy:boolean; mutate:(payload:Record<string,unknown>)=>Promise<boolean> }) {
  const [percentage,setPercentage]=useState(String(basisPoints/100))
  async function save(event:React.FormEvent){event.preventDefault();await mutate({action:'referral.settings',percentage:Number(percentage)})}
  return <section className="max-w-2xl rounded-2xl border border-graphite bg-paper p-6"><p className={EYEBROW}>New-customer referrals</p><h2 className="mt-2 text-2xl font-bold">Referral discount</h2><p className="mt-2 text-sm text-graphite-soft">Each signed-in customer receives a unique referral code. It can be redeemed once by a new customer for their first paid subscription and replaces any promotion code.</p><form onSubmit={event=>void save(event)} className="mt-6 flex flex-wrap items-end gap-4"><label className="w-full max-w-xs text-sm font-bold">Discount percentage<input required min="0" max="100" step="0.01" type="number" value={percentage} onChange={event=>setPercentage(event.target.value)} className="mt-1 w-full rounded-xl border border-graphite bg-white px-3 py-2"/></label><button disabled={busy} className={CTA}>Save referral setting</button></form><p className="mt-4 text-xs text-graphite-soft">Set 0 to disable referral discounts without removing customer codes.</p></section>
}
