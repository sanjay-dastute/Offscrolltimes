import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist/client')
const forbidden = [
  'SESSION_SECRET','LIFECYCLE_SECRET','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET',
  'AUDIT_CHAIN_SECRET','EXPORT_SIGNING_SECRET','access-secret',
  'refresh-secret','customer@example.com','pay_test',
]
async function files(directory) {
  const entries=await readdir(directory,{withFileTypes:true})
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]))).flat()
}
const findings=[]
for(const file of await files(root)){
  if(!/\.(js|css|html|json|map)$/.test(file))continue
  const content=await readFile(file,'utf8')
  for(const marker of forbidden)if(content.toLowerCase().includes(marker.toLowerCase()))findings.push(`${path.relative(root,file)}: ${marker}`)
}
if(findings.length){console.error(`Client bundle contains forbidden server/test markers:\n${findings.join('\n')}`);process.exit(1)}
console.log('Client bundle secret and test-PII marker scan passed.')
