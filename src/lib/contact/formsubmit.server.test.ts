import { afterEach, expect, it, vi } from 'vitest'
import { forwardEnquiry } from './formsubmit.server'
afterEach(()=>vi.unstubAllGlobals())
it('forwards to the fixed business inbox with a reference',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({success:'true'})))
  vi.stubGlobal('fetch',fetcher)
  expect(await forwardEnquiry({reference:'OT-123',message:'A damaged copy'})).toBe(true)
  expect(fetcher.mock.calls[0][0]).toBe('https://formsubmit.co/ajax/hello@offscrolltimes.com')
  expect(JSON.parse(fetcher.mock.calls[0][1].body)._subject).toContain('OT-123')
})
it('does not report delivery acceptance on provider failure',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')))
  expect(await forwardEnquiry({reference:'OT-123'})).toBe(false)
})
