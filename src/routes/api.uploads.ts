import { createFileRoute } from '@tanstack/react-router'
import { json } from '#/lib/http.server'
import { lifecycleBindings } from '#/lib/lifecycle/env.server'
export const Route=createFileRoute('/api/uploads')({server:{handlers:{GET:async()=>{try{const rows=await lifecycleBindings().db.prepare(`SELECT h.id,h.position,h.asset_id FROM homepage_uploads h JOIN object_storage_records o ON o.id=h.asset_id WHERE o.deleted_at IS NULL ORDER BY h.position`).all();return json({uploads:rows.results})}catch{return json({uploads:[]})}}}}})
