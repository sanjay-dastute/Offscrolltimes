CREATE TABLE IF NOT EXISTS contact_enquiries (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  enquiry_type TEXT NOT NULL CHECK (enquiry_type IN ('general','subscription','bulk','partnership')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT,
  detail TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','waiting_customer','resolved','closed')),
  staff_notes TEXT NOT NULL DEFAULT '',
  email_sent INTEGER NOT NULL DEFAULT 0 CHECK (email_sent IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS contact_enquiries_status_created_idx
  ON contact_enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_enquiries_email_created_idx
  ON contact_enquiries(email, created_at DESC);
