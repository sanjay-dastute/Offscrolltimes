import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { readSession } from '#/lib/auth.server'

export const Route=createFileRoute('/api/session')({server:{handlers:{GET:async({request})=>{
  const session=await readSession(request)
  return Response.json(session?{authenticated:true,csrf:session.csrf,user:{name:session.user.name,email:session.user.email,provider:session.user.provider}}:{authenticated:false},{headers:{'Cache-Control':'no-store'}})
}}}})
