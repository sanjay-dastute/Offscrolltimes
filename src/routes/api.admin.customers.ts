import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { customerDirectory } from '#/lib/admin/directory.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { json } from '#/lib/http.server'

export async function getAdminCustomers(request:Request) {
  if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403)
  try{
    const db=lifecycleBindings().db, directory=await customerDirectory(db,new URL(request.url))
    const subscribers=await db.prepare(`SELECT id,email,created_at FROM newsletter_subscribers WHERE status='subscribed' ORDER BY created_at DESC,email`).all<{id:string;email:string;created_at:number}>()
    return json({...directory,newsletterSubscribers:subscribers.results})
  }
  catch{return json({error:'Customer directory is temporarily unavailable.'},503)}
}
export const Route=createFileRoute('/api/admin/customers')({server:{handlers:{GET:({request})=>getAdminCustomers(request)}}})
