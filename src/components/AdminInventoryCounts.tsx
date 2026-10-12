import { useRef,useState,type FormEvent } from 'react'
import { CTA,CTA_OUTLINE,FIELD } from '#/lib/uiKit'
type Edition={id:string;label:string;issue_number:number;printed_copies:number;copies_available:number;subscription_copies:number;bulk_copies:number;marketing_copies:number}
type Entry={id:string;edition_id:string;edition_label:string;kind:string;quantity:number;note:string;created_at:number;updated_at?:number}
type InventoryTab='stock'|'bulk_sale'|'marketing'
export function AdminInventoryCounts({editions,entries,busy,mutate}:{editions:Edition[];entries:Entry[];busy:boolean;mutate:(body:Record<string,unknown>)=>Promise<boolean>}){
  const [tab,setTab]=useState<InventoryTab>('stock'),requestId=useRef(crypto.randomUUID())
  const [editing,setEditing]=useState<Entry|null>(null)
  const bulk=tab==='bulk_sale',categoryTitle=bulk?'Bulk sales':'Marketing copies'
  const filteredEntries=entries.filter(entry=>tab==='stock'||entry.kind===tab)
  const headers=tab==='stock'?['Edition','Printed','Subscription sold / reserved','Bulk sold','Marketing issued','Remaining']:['Edition',bulk?'Bulk copies sold':'Free marketing copies issued','Remaining stock']
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||tab==='stock')return
    const form=event.currentTarget,fields=Object.fromEntries(new FormData(form))
    if(await mutate({action:'inventory.entry',entryId:requestId.current,...fields,kind:tab,quantity:Number(fields.quantity)})){
      requestId.current=crypto.randomUUID();form.reset();window.alert(bulk?'Bulk sale saved.':'Marketing copies saved.')
    }
  }
  async function saveEdit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editing||busy)return
    const fields=Object.fromEntries(new FormData(event.currentTarget))
    if(await mutate({action:'inventory.edit',entryId:editing.id,expectedUpdatedAt:editing.updated_at??0,...fields,quantity:Number(fields.quantity)})){setEditing(null);window.alert('Inventory entry updated. Remaining stock has been adjusted.')}
  }
  return <section className="mt-5 rounded-2xl border border-graphite bg-paper p-5">
    <nav className="flex flex-wrap gap-2" aria-label="Inventory reports">{([['stock','All stock'],['bulk_sale','Bulk sales'],['marketing','Marketing copies']] as const).map(([key,label])=><button type="button" key={key} disabled={busy} aria-pressed={tab===key} className={`rounded-full border border-graphite px-4 py-2 text-sm ${tab===key?'bg-graphite text-paper':''}`} onClick={()=>{setTab(key);setEditing(null);requestId.current=crypto.randomUUID()}}>{label}</button>)}</nav>
    <h3 className="mt-5 font-display text-xl font-bold">{tab==='stock'?'Stock overview':categoryTitle}</h3>
    {tab!=='stock'&&<p className="mt-2 text-sm"><strong>{editions.reduce((sum,edition)=>sum+Number(bulk?edition.bulk_copies:edition.marketing_copies),0)} copies</strong> {bulk?'sold through bulk orders':'issued free for marketing'} across all editions.</p>}
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-graphite">{headers.map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{editions.map(edition=><tr className="border-b border-rule" key={edition.id}><td className="p-2">{edition.issue_number} · {edition.label}</td>{tab==='stock'?<><td>{edition.printed_copies}</td><td>{edition.subscription_copies}</td><td>{edition.bulk_copies}</td><td>{edition.marketing_copies}</td></>:<td>{bulk?edition.bulk_copies:edition.marketing_copies}</td>}<td className="font-bold">{edition.copies_available}</td></tr>)}</tbody></table></div>
    {tab==='stock'?<p className="mt-4 text-sm text-graphite-soft">Open Bulk sales to record an order, or Marketing copies to record free copies issued.</p>:<>
      <h3 className="mt-6 font-display text-xl font-bold">{bulk?'Record a bulk sale':'Record free marketing copies'}</h3>
      <form key={tab} className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={event=>void submit(event)}>
        <label className="text-sm sm:col-span-2">Edition<select required name="editionId" className={`${FIELD} mt-1`} defaultValue=""><option value="" disabled>Choose edition</option>{editions.map(edition=><option key={edition.id} value={edition.id}>{edition.issue_number} · {edition.label} ({edition.copies_available} remaining)</option>)}</select></label>
        <label className="text-sm">{bulk?'Copies sold':'Free copies issued'}<input required type="number" name="quantity" min={1} step={1} className={`${FIELD} mt-1`}/></label>
        <label className="text-sm">{bulk?'Customer / order reference':'Campaign / recipient / purpose'}<input required name="note" maxLength={500} className={`${FIELD} mt-1`}/></label>
        <button disabled={busy||!editions.length} className={CTA}>{busy?'Saving…':bulk?'Save bulk sale':'Save marketing copies'}</button>
      </form>
    </>}
    <h3 className="mt-6 font-display text-xl font-bold">{tab==='stock'?'Inventory history':bulk?'Bulk sales history':'Marketing issue history'}</h3>
    {editing&&<form key={editing.id} className="mt-4 grid gap-3 rounded-xl border border-graphite bg-paper-raised p-4 sm:grid-cols-2" onSubmit={event=>void saveEdit(event)}><h4 className="font-bold sm:col-span-2">Edit {editing.kind==='bulk_sale'?'bulk sale':'marketing copies'}</h4><label className="text-sm">Edition<select required name="editionId" defaultValue={editing.edition_id} className={`${FIELD} mt-1`}>{editions.map(edition=><option key={edition.id} value={edition.id}>{edition.issue_number} · {edition.label}</option>)}</select></label><label className="text-sm">Copies<input required name="quantity" type="number" min={1} step={1} defaultValue={editing.quantity} className={`${FIELD} mt-1`}/></label><label className="text-sm sm:col-span-2">{editing.kind==='bulk_sale'?'Customer / order reference':'Campaign / recipient / purpose'}<input required name="note" maxLength={500} defaultValue={editing.note} className={`${FIELD} mt-1`}/></label><div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className={CTA}>Save changes</button><button disabled={busy} type="button" className={CTA_OUTLINE} onClick={()=>setEditing(null)}>Cancel</button></div></form>}
    <div className="mt-3 max-h-80 overflow-auto">{filteredEntries.length?filteredEntries.map(entry=><article className="flex flex-wrap items-center justify-between gap-2 border-b border-rule py-2 text-sm" key={entry.id}><p>{entry.edition_label} · {entry.kind.replace('_',' ')} · <strong>{entry.quantity} copies</strong> · {entry.note} · {new Date(entry.created_at).toLocaleDateString()}</p>{['bulk_sale','marketing'].includes(entry.kind)&&<button disabled={busy} className={CTA_OUTLINE} onClick={()=>setEditing(entry)}>Edit</button>}</article>):<p className="text-sm text-graphite-soft">{tab==='stock'?'No inventory entries yet.':bulk?'No bulk sales recorded yet.':'No marketing copies issued yet.'}</p>}</div>
    <p className="mt-3 text-xs">Each saved entry reduces the selected edition’s stock. Stock history is retained for every edition.</p>
  </section>
}
