export async function isCustomerProfileComplete(db: D1Database, ownerId: string): Promise<boolean> {
  const row = await db.prepare(`SELECT c.display_name,c.email,c.whatsapp_number,a.name,a.line1,a.city,a.region,a.postal_code,a.country
    FROM users u JOIN customers c ON c.user_id=u.id JOIN addresses a ON a.customer_id=c.id
    WHERE u.owner_id=? AND a.address_type='delivery' AND a.active_to IS NULL ORDER BY a.version DESC LIMIT 1`).bind(ownerId).first<Record<string,string|null>>()
  return !!row && Object.values(row).every(value => !!value?.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email!) && /^\+[1-9][0-9]{7,14}$/.test(row.whatsapp_number!)
}
