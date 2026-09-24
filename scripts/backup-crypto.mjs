import { createCipheriv,createDecipheriv,randomBytes,scryptSync } from 'node:crypto'

const MAGIC=Buffer.from('OFFSCROLL-D1-BACKUP-v1\n')
export function encryptBackup(plaintext,passphrase){
  if(typeof passphrase!=='string'||passphrase.length<32)throw new Error('BACKUP_ENCRYPTION_KEY must contain at least 32 characters.')
  const salt=randomBytes(16),iv=randomBytes(12),key=scryptSync(passphrase,salt,32),cipher=createCipheriv('aes-256-gcm',key,iv)
  const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()])
  return Buffer.concat([MAGIC,salt,iv,cipher.getAuthTag(),ciphertext])
}
export function decryptBackup(payload,passphrase){
  if(!payload.subarray(0,MAGIC.length).equals(MAGIC))throw new Error('Unsupported encrypted backup format.')
  const offset=MAGIC.length,salt=payload.subarray(offset,offset+16),iv=payload.subarray(offset+16,offset+28),tag=payload.subarray(offset+28,offset+44),ciphertext=payload.subarray(offset+44)
  const decipher=createDecipheriv('aes-256-gcm',scryptSync(passphrase,salt,32),iv);decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext),decipher.final()])
}
