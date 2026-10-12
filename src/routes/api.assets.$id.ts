import { createFileRoute } from '@tanstack/react-router'
import { objectResponse } from '#/lib/object-storage.server'

export const Route=createFileRoute('/api/assets/$id')({server:{handlers:{GET:async({params,request})=>await objectResponse(params.id,{},request)??new Response('Asset not found.',{status:404})}}})
