// Razorpay checkout disabled pending approval; original implementation is preserved in src/legacy/RazorpayCheckout.tsx.disabled.
import {createFileRoute,redirect} from '@tanstack/react-router'
export const Route=createFileRoute('/checkout/razorpay')({validateSearch:(search:Record<string,unknown>)=>search,beforeLoad:({search})=>{throw redirect({href:'/checkout/stripe?'+new URLSearchParams(Object.entries(search).map(([key,value])=>[key,String(value)])).toString()})}})
