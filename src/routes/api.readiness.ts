import { createFileRoute } from '@tanstack/react-router'
import { healthResponse } from '#/lib/health.server'
export const Route=createFileRoute('/api/readiness')({server:{handlers:{GET:()=>healthResponse(true)}}})

