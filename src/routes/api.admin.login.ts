import { createFileRoute } from '@tanstack/react-router'
import { adminPasswordLogin, adminPasswordLogout } from '#/lib/admin/password.server'
export const Route=createFileRoute('/api/admin/login')({server:{handlers:{POST:({request})=>adminPasswordLogin(request),DELETE:({request})=>adminPasswordLogout(request)}}})
