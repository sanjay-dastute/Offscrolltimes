import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestD1 } from './lifecycle/testing'
import { initRequestLifecycleBindings, resetRequestLifecycleBindings } from './lifecycle/env.server'
import { newsletterSignup, newsletterSubscribers } from './newsletter.server'
let db:D1Database
const request=(body:unknown,origin='https://example.com')=>new Request('https://example.com/api/newsletter',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})
beforeEach(()=>{db=createTestD1();initRequestLifecycleBindings({LIFECYCLE_DB:db,LIFECYCLE_SECRET:'newsletter-test-secret-at-least-32-characters'})})
afterEach(resetRequestLifecycleBindings)
describe('email signup',()=>{
 it('persists consent, normalizes duplicates and supports token-protected unsubscribe',async()=>{
  const first=await newsletterSignup(request({email:' Reader@Example.com ',consent:true}))
  expect(first.status).toBe(200)
  const result=await first.json() as {manageUrl:string}
  const token=new URL(result.manageUrl,'https://example.com').searchParams.get('token')!
  const saved=await db.prepare('SELECT email,status,consent_text,unsubscribe_token_hash FROM newsletter_subscribers').first<{unsubscribe_token_hash:string}>()
  expect(saved).toMatchObject({email:'reader@example.com',status:'subscribed'})
  expect(saved?.unsubscribe_token_hash).not.toBe(token)
  expect((await newsletterSignup(request({action:'unsubscribe',token}))).status).toBe(200)
  expect(await db.prepare('SELECT status FROM newsletter_subscribers').first()).toMatchObject({status:'unsubscribed'})
  await newsletterSignup(request({email:'reader@example.com',consent:true}))
  expect(await db.prepare('SELECT COUNT(*) total,status FROM newsletter_subscribers').first()).toMatchObject({total:1,status:'subscribed'})
 })
 it('rejects invalid email, missing consent, bots and requests from other origins',async()=>{
  for(const body of [{email:'invalid',consent:true},{email:'reader@example.com',consent:false},{email:'reader@example.com',consent:true,website:'spam'}])expect((await newsletterSignup(request(body))).status).toBe(422)
  expect((await newsletterSignup(request({email:'reader@example.com',consent:true},'https://other.example'))).status).toBe(403)
  expect((await newsletterSignup(request(null))).status).toBe(400)
  expect((await newsletterSignup(request({action:'unsubscribe',token:'0'.repeat(64)}))).status).toBe(404)
  expect((await newsletterSubscribers(new Request('https://example.com/api/newsletter'))).status).toBe(403)
 })
 it('limits signup attempts and returns an actionable storage failure',async()=>{
  for(let i=0;i<10;i++)expect((await newsletterSignup(request({email:`reader${i}@example.com`,consent:true}))).status).toBe(200)
  expect((await newsletterSignup(request({email:'reader11@example.com',consent:true}))).status).toBe(429)
  resetRequestLifecycleBindings()
  expect((await newsletterSignup(request({email:'reader@example.com',consent:true}))).status).toBe(503)
 })
})
