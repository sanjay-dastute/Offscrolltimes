import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '#/components/AuthPage'
export const Route=createFileRoute('/register')({validateSearch:(search:Record<string,unknown>)=>({returnTo:typeof search.returnTo==='string'?search.returnTo:'/account'}),head:()=>({meta:[{title:'Create account | Offscroll Times'},{name:'robots',content:'noindex, nofollow'}]}),component:()=>{const {returnTo}=Route.useSearch();return <AuthPage mode="register" returnTo={returnTo}/>}})
