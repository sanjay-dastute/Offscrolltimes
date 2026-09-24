import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

const VISIT_KEY='offscroll-times-envelope-seen-v1'

export function EnvelopeReveal(){
  const [visible,setVisible]=useState(false),[opening,setOpening]=useState(false)
  const button=useRef<HTMLButtonElement>(null)
  useEffect(()=>{if(sessionStorage.getItem(VISIT_KEY)!=='1'){setVisible(true);document.body.classList.add('envelope-active');requestAnimationFrame(()=>button.current?.focus())}return()=>document.body.classList.remove('envelope-active')},[])
  useEffect(()=>{if(!visible)return;const key=(event:KeyboardEvent)=>{if(event.key==='Tab'){event.preventDefault();button.current?.focus()}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)})
  function open(){if(opening)return;setOpening(true);sessionStorage.setItem(VISIT_KEY,'1');document.body.classList.remove('envelope-active');const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;setTimeout(()=>setVisible(false),reduced?20:1450)}
  function parallax(event:PointerEvent<HTMLDivElement>){if(opening||event.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const box=event.currentTarget.getBoundingClientRect(),x=(event.clientX-box.left)/box.width-.5,y=(event.clientY-box.top)/box.height-.5;event.currentTarget.style.setProperty('--envelope-x',`${x*12}px`);event.currentTarget.style.setProperty('--envelope-y',`${y*8}px`)}
  if(!visible)return null
  return <div className={`envelope-reveal ${opening?'is-opening':''}`} onPointerMove={parallax} role="dialog" aria-modal="true" aria-labelledby="envelope-title" style={{'--envelope-x':'0px','--envelope-y':'0px'} as CSSProperties}>
    <div className="envelope-scene">
      <div className="envelope-letter" aria-hidden="true"><span>Monthly puzzles</span><img src="/offscroll-times-logo.jpeg" alt=""/><small>Free delivery across India</small></div>
      <div className="envelope-shell" aria-hidden="true"><div className="envelope-back"/><div className="envelope-pocket"/><div className="envelope-flap"/><div className="envelope-seal">OT</div></div>
      <div className="envelope-copy"><p>A little something arrived for you</p><h1 id="envelope-title">Open today’s<br/>Offscroll Times</h1><button ref={button} className="envelope-open" onClick={open}>Open the envelope <span aria-hidden="true">→</span></button></div>
    </div>
  </div>
}
