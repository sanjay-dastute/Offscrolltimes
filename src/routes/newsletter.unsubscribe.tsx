import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { SiteHeader } from '#/components/SiteHeader'
import { SiteFooter } from '#/components/Faq'
import { CTA, SHELL } from '#/lib/uiKit'
export const Route=createFileRoute('/newsletter/unsubscribe')({validateSearch:(search:Record<string,unknown>)=>({token:typeof search.token==='string'?search.token:''}),head:()=>({meta:[{title:'Manage email signup | Offscroll Times'},{name:'robots',content:'noindex, nofollow'},{name:'referrer',content:'no-referrer'}]}),component:Unsubscribe})
function Unsubscribe() {
 const {token}=Route.useSearch(),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('')
 useEffect(()=>setReady(true),[])
 async function unsubscribe() {
  setBusy(true);setError('')
  try{const response=await fetch('/api/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'unsubscribe',token})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error||'Please retry.');setDone(true)}catch(cause){setError(cause instanceof Error?cause.message:'Please retry.')}finally{setBusy(false)}
 }
 return <><SiteHeader/><main className={`${SHELL} min-h-[50vh] py-16`}><h1 className="font-display text-4xl font-bold">Manage email signup</h1><p className="mt-4">Unsubscribing stops email updates. Your newspaper subscription stays active.</p>{done?<p role="status" className="mt-6">You have been unsubscribed.</p>:<button disabled={!ready||busy||!token} className={`${CTA} mt-6`} onClick={()=>void unsubscribe()}>{busy?'Unsubscribing…':'Unsubscribe from email updates'}</button>}{!token&&<p className="mt-4">Use your signup management link or <a href="/contact">contact support</a>.</p>}{error&&<p role="alert" className="mt-4">{error}</p>}</main><SiteFooter/></>
}
