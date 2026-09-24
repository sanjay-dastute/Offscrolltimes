import { createServerFn } from '@tanstack/react-start';
import { lifecycleBindings } from '#/lib/lifecycle/env.server';
import { forwardEnquiry } from './formsubmit.server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ENQUIRY_LABELS: Record<string, string> = {
  general: 'General enquiry',
  subscription: 'Subscription & order support',
  bulk: 'Bulk & corporate orders',
  partnership: 'Partnership & retailer enquiry',
};

export type ContactEnquiryInput = {
  enquiryType: string;
  name: string;
  email: string;
  country: string;
  detail: string;
  message: string;
  website?: string;
  startedAt: number;
  turnstileToken?: string;
};

export type ContactEnquiryResult =
  | { ok: true; emailSent: boolean; reference: string }
  | { ok: false; error: 'invalid_name' | 'invalid_email' | 'invalid_message' | 'invalid_type' | 'spam' | 'rate_limited' | 'unavailable' };

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const result = await response.json() as { success?: boolean };
    return response.ok && result.success === true;
  } catch { return false; }
}

export const submitContactEnquiry = createServerFn({ method: 'POST' })
  .validator((input: ContactEnquiryInput) => input)
  .handler(async ({ data }): Promise<ContactEnquiryResult> => {
    const name = data.name.trim().slice(0, 100);
    const email = data.email.trim().toLowerCase().slice(0, 200);
    const country = data.country.trim().slice(0, 80);
    const detail = data.detail.trim().slice(0, 200);
    const message = data.message.trim().slice(0, 4000);
    const now = Date.now();

    if (!ENQUIRY_LABELS[data.enquiryType]) return { ok: false, error: 'invalid_type' };
    if (!name) return { ok: false, error: 'invalid_name' };
    if (!EMAIL_PATTERN.test(email)) return { ok: false, error: 'invalid_email' };
    if (message.length < 10) return { ok: false, error: 'invalid_message' };
    if (data.website?.trim() || !Number.isFinite(data.startedAt) || now - data.startedAt < 2500) return { ok: false, error: 'spam' };
    if (!await verifyTurnstile(data.turnstileToken?.trim() ?? '')) return { ok: false, error: 'spam' };

    let database: D1Database;
    try { database = lifecycleBindings().db; } catch { return { ok: false, error: 'unavailable' }; }
    const recent = await database.prepare(`SELECT COUNT(*) count FROM contact_enquiries WHERE email = ? AND created_at > ?`)
      .bind(email, now - 60 * 60 * 1000).first<{ count: number }>();
    if ((recent?.count ?? 0) >= 5) return { ok: false, error: 'rate_limited' };

    const id = crypto.randomUUID();
    const reference = `PP-${new Date(now).toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(0, 6).toUpperCase()}`;
    await database.prepare(`INSERT INTO contact_enquiries
      (id, reference, enquiry_type, name, email, country, detail, message, status, staff_notes, email_sent, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', '', 0, ?, ?)`)
      .bind(id, reference, data.enquiryType, name, email, country || null, detail || null, message, now, now).run();

    const emailSent = await forwardEnquiry({name,email,country,detail,message,reference,enquiry:ENQUIRY_LABELS[data.enquiryType],_replyto:email});
    if (emailSent) {
      await database.prepare('UPDATE contact_enquiries SET email_sent=1, updated_at=? WHERE id=?').bind(Date.now(),id).run();
    }
    return { ok: true, emailSent, reference };
  });
