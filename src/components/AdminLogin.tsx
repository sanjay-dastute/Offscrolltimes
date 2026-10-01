import { useState, type FormEvent } from 'react'
import { CTA, H2 } from '#/lib/uiKit'
export function AdminLogin({onSuccess}:{onSuccess:()=>Promise<void>}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const fields=new FormData(event.currentTarget);setBusy(true);setError('')
    try{const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fields.get('username'),password:fields.get('password')})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??'Sign-in failed.');await onSuccess()}catch(error){setError(error instanceof Error?error.message:'Sign-in failed. Please retry.')}finally{setBusy(false)}
  }
  return <section className="mx-auto max-w-md rounded-2xl border border-graphite bg-paper-raised p-6"><h1 className={H2}>Admin sign in</h1><form onSubmit={submit} className="mt-6 grid gap-5"><label>Username<input name="username" autoComplete="username" required className="mt-2 block w-full rounded-xl border border-graphite bg-paper px-4 py-3"/></label><label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} className="mt-2 block w-full rounded-xl border border-graphite bg-paper px-4 py-3"/></label><button disabled={busy} className={CTA}>{busy?'Signing in…':'Sign in'}</button>{error&&<p role="alert" className="text-red-800">{error}</p>}</form></section>
}
