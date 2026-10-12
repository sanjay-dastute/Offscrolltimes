import { useEffect, useState } from 'react'
export function HomepageVideo(){
  const [source,setSource]=useState('/images/IMG_8051.mp4')
  useEffect(()=>{void fetch('/api/uploads').then(r=>r.json() as Promise<{video?:{asset_id:string}|null}>).then(data=>{if(data.video)setSource(`/api/assets/${data.video.asset_id}`)}).catch(()=>{})},[])
  return <div className="interactive-newspaper overflow-hidden border border-graphite bg-paper-raised shadow-[8px_8px_0_rgba(23,21,18,0.14)]"><video key={source} src={source} className="block aspect-[4/5] w-full bg-sun object-cover" autoPlay loop muted playsInline preload="metadata" aria-label="Offscroll Times newspaper preview">Your browser does not support this video.</video></div>
}
