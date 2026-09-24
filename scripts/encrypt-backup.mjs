import { readFileSync,writeFileSync } from 'node:fs'
import { encryptBackup } from './backup-crypto.mjs'
const [input,output]=process.argv.slice(2),key=process.env.BACKUP_ENCRYPTION_KEY
if(!input||!output)throw new Error('Usage: node scripts/encrypt-backup.mjs input.sql output.enc')
writeFileSync(output,encryptBackup(readFileSync(input),key))
process.stdout.write(`Encrypted backup written to ${output}\n`)
