import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { decryptBackup } from './backup-crypto.mjs'
const [input]=process.argv.slice(2),key=process.env.BACKUP_ENCRYPTION_KEY
if(!input)throw new Error('Usage: node scripts/verify-encrypted-backup.mjs backup.enc')
const db=new DatabaseSync(':memory:'),sql=decryptBackup(readFileSync(input),key).toString('utf8');db.exec('PRAGMA foreign_keys=OFF;');db.exec(sql)
const integrity=db.prepare('PRAGMA integrity_check').get().integrity_check
if(integrity!=='ok')throw new Error(`Restoration integrity check failed: ${integrity}`)
const required=['users','orders','customer_payments','customer_subscriptions','account_events','admin_audit_log','security_audit_chain']
const present=new Set(db.prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view')`).all().map(row=>row.name))
const missing=required.filter(name=>!present.has(name));if(missing.length)throw new Error(`Restoration is missing: ${missing.join(', ')}`)
process.stdout.write(`${JSON.stringify({restoration:'verified',integrity,requiredRecords:'present'})}\n`)
