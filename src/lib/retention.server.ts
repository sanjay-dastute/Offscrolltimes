export async function runRetentionCleanup(db:D1Database,now=Date.now()) {
  const day=24*60*60*1000
  const oauth=await db.prepare(`DELETE FROM oauth_transactions WHERE expires_at<?`).bind(now-day).run()
  const sessions=await db.prepare(`DELETE FROM application_sessions WHERE expires_at<? OR (revoked_at IS NOT NULL AND revoked_at<?)`).bind(now-30*day,now-30*day).run()
  const enquiries=await db.prepare(`UPDATE contact_enquiries SET name='Removed',email='removed@invalid.local',country=NULL,detail=NULL,message='Removed under retention policy',staff_notes='',updated_at=? WHERE status IN ('resolved','closed') AND updated_at<?`).bind(now,now-730*day).run()
  return {oauthTransactions:oauth.meta.changes??0,sessions:sessions.meta.changes??0,enquiriesAnonymised:enquiries.meta.changes??0}
}
