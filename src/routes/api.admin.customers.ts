import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { customerDirectory } from '#/lib/admin/directory.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
import { json } from '#/lib/http.server'

export async function getAdminCustomers(request:Request) {
  if(!await readAdministratorSession(request))return json({error:'Administrator access required.'},403)
  try{return json(await customerDirectory(lifecycleBindings().db,new URL(request.url)))}
  catch{return json({error:'Customer directory is temporarily unavailable.'},503)}
}
export const Route=createFileRoute('/api/admin/customers')({server:{handlers:{GET:({request})=>getAdminCustomers(request)}}})
