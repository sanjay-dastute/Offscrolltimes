import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'

/** Decorative margin illustrations; never intercept clicks or cover purchase forms. */
export function PaperAtmosphere(){
  const path=useRouterState({select:state=>state.location.pathname})
  const ref=useRef<HTMLDivElement>(null)
  const enabled=['/','/about','/faq','/contact','/subscription'].includes(path)
  useEffect(()=>{
    if(!enabled)return
    const media=matchMedia('(prefers-reduced-motion: reduce)')
    let frame=0
    const update=()=>{frame=0;ref.current?.style.setProperty('--paper-drift',`${Math.sin(window.scrollY/650)*32}px`)}
    const scroll=()=>{if(!media.matches&&!frame)frame=requestAnimationFrame(update)}
    const preference=()=>{if(media.matches){cancelAnimationFrame(frame);frame=0;ref.current?.style.setProperty('--paper-drift','0px')}else scroll()}
    window.addEventListener('scroll',scroll,{passive:true});media.addEventListener('change',preference);preference()
    return()=>{window.removeEventListener('scroll',scroll);media.removeEventListener('change',preference);cancelAnimationFrame(frame)}
  },[enabled,path])
  if(!enabled)return null
  return <div ref={ref} className="paper-atmosphere" aria-hidden="true">
    <svg className="paper-doodle paper-doodle-pencil" viewBox="0 0 80 160" fill="none"><g stroke="currentColor" strokeWidth="3" strokeLinejoin="round"><path fill="#ffd45a" d="M23 35h34v90l-17 27-17-27z"/><path fill="#f9ecd0" d="m23 125 17 27 17-27"/><path fill="#ec9778" d="M23 35V18c0-12 34-12 34 0v17z"/><path d="M34 40v78M47 40v78M35 144h10"/><path d="M31 60v4m18-4v4m-15 12q6 7 12 0"/></g></svg>
    <svg className="paper-doodle paper-doodle-news" viewBox="0 0 120 130" fill="none"><g stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path fill="#fff5da" d="M15 12h88v105H15z"/><path d="M28 29h61M28 38h61M28 84h22m17 0h22M28 95h61"/><path fill="#ffd45a" d="M28 49h25v24H28z"/><path d="M66 51h23m-23 10h23m-23 10h17M40 106q18 12 36 0"/></g></svg>
  </div>
}
