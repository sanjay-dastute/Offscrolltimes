type DeliveryRow={name:string;address:string;phone:string;status:string;endsAt:string}

const safe=(value:string)=>value.replace(/[^\x20-\x7E]/g,'?').replace(/[\\()]/g,'\\$&').slice(0,118)
const text=(value:string,x:number,y:number,size=8)=>`BT /F1 ${size} Tf ${x} ${y} Td (${safe(value)}) Tj ET`

// A compact, dependency-free A4 landscape PDF. It deliberately contains only
// the minimum delivery information required by the printer/dispatch team.
export function deliveryPrintPdf(rows:DeliveryRow[],title:string){
  const pages:Array<string>=[]
  for(let start=0;start<Math.max(rows.length,1);start+=25){
    const body=rows.slice(start,start+25)
    const lines=[text('OFFSCROLL TIMES - DELIVERY PRINT LIST',36,555,15),text(title,36,538,9),text('Customer and delivery address',36,516,8),text('Phone',520,516,8),text('Status / end date',635,516,8)]
    body.forEach((row,index)=>{const y=496-index*18;lines.push(`36 ${y-4} m 806 ${y-4} l S`,text(`${row.name} - ${row.address}`,36,y),text(row.phone,520,y),text(`${row.status} / ${row.endsAt}`,635,y))})
    if(!body.length)lines.push(text('No active paid subscriptions are currently eligible for delivery.',36,496,10))
    pages.push(lines.join('\n'))
  }
  const objects:string[]=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${pages.map((_,i)=>`${3+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`]
  pages.forEach((content,i)=>{const page=3+i*2,stream=page+1;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${stream} 0 R >>`,`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)})
  let pdf='%PDF-1.4\n',offsets=[0]
  objects.forEach((object,index)=>{offsets.push(pdf.length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`})
  const xref=pdf.length
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}
