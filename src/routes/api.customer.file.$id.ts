import { createFileRoute } from '@tanstack/react-router'
import { readSession } from '#/lib/auth.server'
import { objectResponse } from '#/lib/object-storage.server'

export const Route=createFileRoute('/api/customer/file/$id')({server:{handlers:{GET:async({request,params})=>{
  const session=await readSession(request);if(!session)return new Response('Sign in required.',{status:401})
  return await objectResponse(params.id,{ownerId:session.user.id})??new Response('File not found.',{status:404})
}}}})
