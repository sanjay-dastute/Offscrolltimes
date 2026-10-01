import { createFileRoute } from '@tanstack/react-router'
import { downloadAdminExport } from '#/lib/admin/exports.server'
export const Route=createFileRoute('/api/admin/export')({server:{handlers:{POST:({request})=>downloadAdminExport(request)}}})
