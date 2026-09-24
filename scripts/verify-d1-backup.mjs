import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const file=process.argv[2]
if(!file)throw new Error('Usage: pnpm db:verify-backup <path-to-export.sql>')
const sql=readFileSync(file,'utf8'),db=new DatabaseSync(':memory:')
db.exec('PRAGMA foreign_keys=OFF;')
db.exec(sql)
const integrity=db.prepare('PRAGMA integrity_check').get()
if(integrity.integrity_check!=='ok')throw new Error(`Integrity check failed: ${integrity.integrity_check}`)
const required=['users','customers','orders','customer_payments','customer_subscriptions','editions','customer_fulfilments','admin_audit_log','security_audit_chain']
const present=new Set(db.prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view')`).all().map(row=>row.name))
const missing=required.filter(name=>!present.has(name))
if(missing.length)throw new Error(`Backup is missing required records: ${missing.join(', ')}`)
const counts=Object.fromEntries(required.map(name=>[name,db.prepare(`SELECT COUNT(*) count FROM "${name}"`).get().count]))
process.stdout.write(`${JSON.stringify({integrity:'ok',requiredRecords:'present',counts},null,2)}\n`)
