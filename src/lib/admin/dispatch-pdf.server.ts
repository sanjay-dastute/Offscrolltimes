type DeliveryRow={name:string;address:string;phone:string;status:string;endsAt:string}

const safe=(value:string)=>value.replace(/[^\x20-\x7E]/g,'?').replace(/[\\()]/g,'\\$&').slice(0,108)
const text=(value:string,x:number,y:number,size=10,font='F1')=>`BT /${font} ${size} Tf ${x} ${y} Td (${safe(value)}) Tj ET`

function wrapAddress(address:string,maxChars=62) {
  const words=address.replace(/\s+/g,' ').trim().split(' ').filter(Boolean)
  const lines:string[]=[]
  let line=''
  for(const word of words){
    const next=line?`${line} ${word}`:word
    if(next.length>maxChars&&line){lines.push(line);line=word}else line=next
  }
  if(line)lines.push(line)
  return lines.length?lines.slice(0,6):['Not provided']
}

function label(row:DeliveryRow, bottom:number) {
  const top=bottom+421
  const lines=[
    `36 ${bottom} m 559 ${bottom} l 559 ${top} l 36 ${top} l h S`,
    text('DELIVERY ADDRESS',54,top-42,16,'F2'),
    text('To',54,top-76,11,'F2'),
    text(`Name: ${row.name||'Not provided'}`,54,top-104,12),
    text('Address:',54,top-134,12,'F2'),
  ]
  wrapAddress(row.address).forEach((line,index)=>lines.push(text(line,70,top-156-index*18,11)))
  lines.push(text(`Phone Number: ${row.phone||'Not provided'}`,54,bottom+48,12,'F2'))
  return lines
}

// A4 portrait sheet with two equal, cut-ready delivery labels. Each label is
// restricted to a single subscriber's delivery information.
export function deliveryPrintPdf(rows:DeliveryRow[],title:string){
  // Kept for the existing export call signature; labels intentionally contain
  // only the recipient delivery fields.
  void title
  const pages:Array<string>=[]
  for(let start=0;start<Math.max(rows.length,1);start+=2){
    const body=rows.slice(start,start+2)
    const lines=[`0.5 w 36 421 m 559 421 l S`,text('CUT HERE',275,416,7)]
    if(body[0])lines.push(...label(body[0],421))
    else lines.push(...label({name:'No delivery address',address:'',phone:'',status:'',endsAt:''},421))
    if(body[1])lines.push(...label(body[1],0))
    else lines.push(...label({name:'No delivery address',address:'',phone:'',status:'',endsAt:''},0))
    pages.push(lines.join('\n'))
  }
  const objects:string[]=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${pages.map((_,i)=>`${3+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`]
  pages.forEach((content,i)=>{const page=3+i*2,stream=page+1;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${stream} 0 R >>`,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)})
  let pdf='%PDF-1.4\n',offsets=[0]
  objects.forEach((object,index)=>{offsets.push(pdf.length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`})
  const xref=pdf.length
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}
