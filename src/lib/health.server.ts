import { lifecycleBindings } from '#/lib/lifecycle/env.server'

export async function healthResponse(readiness = false) {
  if (!readiness) return Response.json({ status: 'ok', service: 'offscroll-times' }, { headers: { 'Cache-Control': 'no-store' } })
  const checks: Record<string, boolean> = {
    database: false,
    googleAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoftAuth: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
    razorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET),
    sessionSecurity: Boolean(process.env.SESSION_SECRET && process.env.AUDIT_CHAIN_SECRET && process.env.EXPORT_SIGNING_SECRET),
  }
  try {
    const db=lifecycleBindings().db
    const row=await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='operational_health_runs'`).first<{name:string}>()
    checks.database=row?.name==='operational_health_runs'
  } catch { checks.database=false }
  const ready=Object.values(checks).every(Boolean)
  return Response.json({ status: ready ? 'ready' : 'not_ready', checks }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}

export async function recordOperationalHealth(db:D1Database,source:'scheduled'|'manual'|'deployment'='scheduled'){
  const [payments,messages,webhooks]=await Promise.all([
    db.prepare(`SELECT COUNT(*) total FROM customer_payments WHERE status='failed' AND updated_at>?`).bind(Date.now()-3600000).first<{total:number}>(),
    db.prepare(`SELECT COUNT(*) total FROM transactional_email_log WHERE status IN ('failed','bounced','complained') AND updated_at>?`).bind(Date.now()-3600000).first<{total:number}>(),
    db.prepare(`SELECT COUNT(*) total FROM razorpay_webhook_receipts WHERE processed_at IS NULL AND received_at<?`).bind(Date.now()-300000).first<{total:number}>(),
  ])
  const values={failedPayments:Number(payments?.total??0),failedMessages:Number(messages?.total??0),unprocessedWebhooks:Number(webhooks?.total??0)}
  const status=Object.values(values).some(value=>value>0)?'degraded':'healthy',now=Date.now()
  await db.prepare(`INSERT INTO operational_health_runs(id,source,status,failed_payments,failed_messages,unprocessed_webhooks,created_at) VALUES(?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),source,status,values.failedPayments,values.failedMessages,values.unprocessedWebhooks,now).run()
  if(status==='degraded')await db.prepare(`INSERT INTO operational_alerts(id,alert_type,severity,summary,created_at) VALUES(?,?,?,?,?)`).bind(crypto.randomUUID(),'operational_failures',values.unprocessedWebhooks?'critical':'warning',`Payment failures: ${values.failedPayments}; message failures: ${values.failedMessages}; delayed webhooks: ${values.unprocessedWebhooks}`,now).run()
  return {status,...values}
}
