import { useState } from 'react'
import { CTA, CTA_OUTLINE, FIELD, H2 } from '#/lib/uiKit'

type Offer=Record<string,any>
const localDate=(value:unknown)=>{if(!value)return '';const date=new Date(Number(value));return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
export function AdminOffers({offers,busy,mutate}:{offers:Offer[];busy:boolean;mutate:(payload:Record<string,unknown>)=>Promise<boolean>}) {
  const [selected,setSelected]=useState<Offer|null>(null),[revision,setRevision]=useState(0)
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget,fields=Object.fromEntries(new FormData(form))
    if(await mutate({action:'catalog.upsert',kind:'discount',...fields,active:fields.active==='on',combinable:fields.combinable==='on'})){setSelected(null);setRevision(value=>value+1)}
  }
  const field=(name:string,label:string,value:unknown,type='text',required=false)=><label key={name}>{label}<input name={name} className={`${FIELD} mt-1`} defaultValue={String(value??'')} type={type} required={required} readOnly={name==='id'&&Boolean(selected)} min={type==='number'?0:undefined}/></label>
  const list=(value:unknown)=>{try{return value?(JSON.parse(String(value)) as unknown[]).join(','):''}catch{return ''}}
  return <section><h2 className={H2}>Offers and discounts</h2><p className="mt-3">Create, edit or deactivate saved offers. Fixed discounts use paise; percentage discounts use basis points (1000 = 10%).</p>
    <div className="my-6 grid gap-3">{offers.length?offers.map(offer=><article key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-graphite p-4"><div><strong>{offer.code}</strong><p className="text-sm">{offer.kind} · {offer.value} · {offer.active?'Active':'Inactive'}{offer.ends_at?` · Expires ${new Date(offer.ends_at).toLocaleString()}`:''}</p></div><div className="flex gap-2"><button disabled={busy} className={CTA_OUTLINE} onClick={()=>{setSelected(offer);setRevision(value=>value+1)}}>Edit</button><button disabled={busy} className={CTA_OUTLINE} onClick={()=>void mutate({action:'discount.toggle',discountId:offer.id,active:!offer.active})}>{offer.active?'Deactivate':'Activate'}</button></div></article>):<p>No offers created yet.</p>}</div>
    <form key={revision} onSubmit={save} className="rounded-2xl border border-graphite bg-paper p-5"><h3 className="text-xl font-bold">{selected?'Edit offer':'Create offer'}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">
      {field('id','Offer ID',selected?.id,'text',true)}{field('code','Discount code',selected?.code,'text',true)}
      <label>Type<select name="discountKind" defaultValue={selected?.kind||'percentage'} className={`${FIELD} mt-1`}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option><option value="free_shipping">Free delivery</option></select></label>
      {field('value','Value',selected?.value??0,'number',true)}{field('startsAt','Starts (your local time)',localDate(selected?.starts_at),'datetime-local')}{field('endsAt','Expires (your local time)',localDate(selected?.ends_at),'datetime-local')}
      {field('usageLimit','Total usage limit',selected?.usage_limit,'number')}{field('perCustomerLimit','Per-customer limit',selected?.per_customer_limit,'number')}{field('minimumDurationMonths','Minimum months',selected?.minimum_duration_months,'number')}{field('minimumOrderMinor','Minimum order (paise)',selected?.minimum_order_minor,'number')}{field('eligibleDurations','Eligible months, comma-separated',list(selected?.eligible_durations_json))}{field('eligibleCountries','Eligible country codes, comma-separated',list(selected?.eligible_countries_json))}
      <label><input name="active" type="checkbox" defaultChecked={Boolean(selected?.active)}/> Active</label><label><input name="combinable" type="checkbox" defaultChecked={Boolean(selected?.combinable_with_duration_discount)}/> Combine with duration discount</label>
    </div><div className="mt-5 flex gap-3"><button disabled={busy} className={CTA}>Save offer</button>{selected&&<button type="button" className={CTA_OUTLINE} onClick={()=>{setSelected(null);setRevision(value=>value+1)}}>Cancel editing</button>}</div></form>
  </section>
}
