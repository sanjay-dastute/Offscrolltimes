import { describe, expect, it } from 'vitest'
import { firstEditionDate, formatLongDate, nextIssueSchedule } from './dates'

describe('monthly issue schedule', () => {
  it('dispatches the November issue on the 25th', () => {
    expect(formatLongDate(firstEditionDate(new Date('2026-10-01T12:00:00Z')))).toBe('November 25, 2026')
  })
  it('rolls the issue and countdown together at midnight after the India cutoff', () => {
    expect(nextIssueSchedule(Date.parse('2026-10-20T18:29:59Z'))).toMatchObject({issue:'November 2026',cutoff:'October 20, 2026',deadline:Date.parse('2026-10-20T18:30:00Z')})
    expect(nextIssueSchedule(Date.parse('2026-10-20T18:30:00Z'))).toMatchObject({issue:'December 2026',cutoff:'November 20, 2026',deadline:Date.parse('2026-11-20T18:30:00Z')})
  })
  it('rolls into the next year', () => {
    expect(nextIssueSchedule(Date.parse('2026-12-21T12:00:00Z'))).toMatchObject({issue:'February 2027',cutoff:'January 20, 2027'})
  })
})
