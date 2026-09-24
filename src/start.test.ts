import { describe, expect, it } from 'vitest'
import { canonicalEntryRedirect } from './start'

describe('canonical domain routing', () => {
  it('keeps canonical redirects ahead of recipient response handling', () => {
    const request = new Request('https://www.offscrolltimes.com/account')
    const response = canonicalEntryRedirect(request)

    expect(response?.status).toBe(308)
    expect(response?.headers.get('location')).toBe('https://offscrolltimes.com/account')
  })
})
