import { describe,expect,it } from 'vitest'
import { decryptBackup,encryptBackup } from '../../scripts/backup-crypto.mjs'
describe('encrypted database backups',()=>{
  it('round-trips backup bytes and rejects a wrong key',()=>{const source=Buffer.from('CREATE TABLE proof(id TEXT);'),key='backup-test-key-that-is-longer-than-32-characters',encrypted=encryptBackup(source,key);expect(encrypted.includes(source)).toBe(false);expect(decryptBackup(encrypted,key)).toEqual(source);expect(()=>decryptBackup(encrypted,'wrong-key-that-is-still-long-enough-123456')).toThrow()})
})
