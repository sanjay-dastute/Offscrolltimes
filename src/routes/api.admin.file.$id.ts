import { createFileRoute } from '@tanstack/react-router'
import { readAdministratorSession } from '#/lib/admin/auth.server'
import { objectResponse } from '#/lib/object-storage.server'

export const Route=createFileRoute('/api/admin/file/$id')({server:{handlers:{GET:async({request,params})=>{
  const session=await readAdministratorSession(request);if(!session)return new Response('Administrator access required.',{status:403})
  return await objectResponse(params.id,{admin:true})??new Response('File not found.',{status:404})
}}}})
