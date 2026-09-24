import { createFileRoute } from '@tanstack/react-router'
import { objectResponse } from '#/lib/object-storage.server'

export const Route=createFileRoute('/api/assets/$id')({server:{handlers:{GET:async({params})=>await objectResponse(params.id,{})??new Response('Asset not found.',{status:404})}}})
