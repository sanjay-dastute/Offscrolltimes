import { useState } from 'react'
import { CTA, CTA_OUTLINE, FIELD, H2 } from '#/lib/uiKit'

type Offer = Record<string, any>
const localDate = (value: unknown) => value ? new Date(new Date(Number(value)).getTime() - new Date(Number(value)).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ''

export function AdminOffers({ offers, busy, mutate }: { offers: Offer[]; busy: boolean; mutate: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [selected, setSelected] = useState<Offer | null>(null)
  const [revision, setRevision] = useState(0)
  const [formError, setFormError] = useState('')
  const [discountKind, setDiscountKind] = useState<'percentage'|'fixed'>('percentage')
  const reset = () => { setSelected(null); setDiscountKind('percentage'); setFormError(''); setRevision(value => value + 1) }
  const beginEdit = (offer: Offer) => { setSelected(offer); setDiscountKind(offer.kind === 'fixed' ? 'fixed' : 'percentage'); setFormError(''); setRevision(value => value + 1) }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError('')
    const fields = Object.fromEntries(new FormData(event.currentTarget)), startsAt = String(fields.startsAt ?? ''), endsAt = String(fields.endsAt ?? '')
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) { setFormError('The end date and time must be later than the start date and time.'); return }
    const enteredValue = Number(fields.value), usageLimitText = String(fields.usageLimit ?? '').trim()
    if (!Number.isFinite(enteredValue) || enteredValue < 0 || (discountKind === 'percentage' && enteredValue > 100)) { setFormError(discountKind === 'percentage' ? 'Enter a percentage from 0 to 100.' : 'Enter a valid fixed discount amount.'); return }
    if (usageLimitText && (!Number.isSafeInteger(Number(usageLimitText)) || Number(usageLimitText) < 1)) { setFormError('Total user limit must be a whole number of at least 1.'); return }
    const saved = await mutate({ action:'catalog.upsert', kind:'discount', id:selected?.id ?? `offer_${crypto.randomUUID()}`, name:String(fields.offerName ?? '').trim(), code:String(fields.code ?? '').trim().toUpperCase(), discountKind, value:Math.round(enteredValue * 100), startsAt, endsAt, usageLimit:usageLimitText || null, eligibleDurations:String(fields.durationMonths), active:selected?.active ?? true, combinable:false })
    if (saved) reset()
  }
  async function remove(offer: Offer) { if (window.confirm(`Delete ${offer.code}? This cannot be undone if the offer has not been used.`) && await mutate({action:'discount.delete',discountId:offer.id,confirm:true})) reset() }
  const selectedDuration = (() => { try { const value = Number((JSON.parse(String(selected?.eligible_durations_json ?? '[]')) as unknown[])[0]); return [1,3,12].includes(value) ? value : 1 } catch { return 1 } })()
  const displayValue = Number(selected?.value ?? 0) / 100

  return <section><h2 className={H2}>Offers and discounts</h2><p className="mt-3">Create one discount for one subscription plan. It applies to all delivery countries and can be used once per customer.</p>
    <div className="my-6 grid gap-3">{offers.length ? offers.map(offer=><article key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-graphite p-4"><div><strong>{offer.name||offer.code}</strong><p className="text-sm">{offer.code} · {offer.kind} · {offer.kind==='percentage'?`${Number(offer.value)/100}%`:Number(offer.value)/100} · {offer.active?'Active':'Inactive'}{offer.ends_at?` · Expires ${new Date(offer.ends_at).toLocaleString()}`:''}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className={CTA_OUTLINE} onClick={()=>beginEdit(offer)}>Edit</button><button disabled={busy} className={CTA_OUTLINE} onClick={()=>void mutate({action:'discount.toggle',discountId:offer.id,active:!offer.active})}>{offer.active?'Deactivate':'Activate'}</button><button disabled={busy} className={CTA_OUTLINE} onClick={()=>void remove(offer)}>Delete</button></div></article>) : <p>No offers created yet.</p>}</div>
    <form key={revision} onSubmit={event=>void save(event)} className="rounded-2xl border border-graphite bg-paper p-5"><h3 className="text-xl font-bold">{selected?'Edit offer':'Create offer'}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label>Offer name<input name="offerName" className={`${FIELD} mt-1`} defaultValue={selected?.name||selected?.code||''} placeholder="Diwali offer" required/></label><label>Discount code<input name="code" className={`${FIELD} mt-1`} defaultValue={selected?.code??''} placeholder="DIWALI10" required/></label>
      <label>Type<select name="discountKind" value={discountKind} onChange={event=>setDiscountKind(event.target.value==='fixed'?'fixed':'percentage')} className={`${FIELD} mt-1`}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label><label>{discountKind==='percentage'?'Percentage (%)':'Fixed amount (₹)'}<input name="value" type="number" min="0" max={discountKind==='percentage'?100:undefined} step="0.01" defaultValue={displayValue} className={`${FIELD} mt-1`} required/></label>
      <label>Start date &amp; time<input name="startsAt" type="datetime-local" defaultValue={localDate(selected?.starts_at)} className={`${FIELD} mt-1`}/></label><label>End date &amp; time<input name="endsAt" type="datetime-local" defaultValue={localDate(selected?.ends_at)} className={`${FIELD} mt-1`}/></label>
      <label>Total user limit<input name="usageLimit" type="number" min="1" step="1" defaultValue={selected?.usage_limit??''} placeholder="Leave blank for no limit" className={`${FIELD} mt-1`}/></label><label>Plan<select name="durationMonths" defaultValue={selectedDuration} className={`${FIELD} mt-1`}><option value="1">1 month</option><option value="3">3 months</option><option value="12">12 months</option></select></label>
    </div>{formError&&<p role="alert" className="mt-4 rounded-lg border border-red-700 bg-red-50 p-3 text-sm text-red-900">{formError}</p>}<div className="mt-5 flex gap-3"><button disabled={busy} className={CTA}>Save offer</button>{selected&&<button type="button" className={CTA_OUTLINE} onClick={reset}>Cancel editing</button>}</div></form>
  </section>
}
