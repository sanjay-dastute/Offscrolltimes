import { describe, expect, it } from 'vitest'
import { firstEditionDate, firstEditionTimestamp, formatLongDate, nextIssueSchedule, novemberLaunchTerm, subscriptionCycleStartAt } from './dates'

describe('monthly issue schedule', () => {
  it('dispatches the November issue on the 25th', () => {
    expect(formatLongDate(firstEditionDate(new Date('2026-10-01T12:00:00Z')))).toBe('November 25, 2026')
  })
  it('rolls the issue and countdown together after 11:59 PM on the India 25th', () => {
    expect(nextIssueSchedule(Date.parse('2026-11-20T18:29:59.999Z'))).toMatchObject({issue:'December 2026',cutoff:'November 20, 2026',deadline:Date.parse('2026-11-20T18:29:59.999Z')})
    expect(nextIssueSchedule(Date.parse('2026-11-20T18:30:00Z'))).toMatchObject({issue:'January 2027',cutoff:'December 25, 2026',deadline:Date.parse('2026-12-25T18:29:59.999Z')})
    expect(nextIssueSchedule(Date.parse('2026-11-25T18:30:00Z'))).toMatchObject({issue:'January 2027',cutoff:'December 25, 2026',deadline:Date.parse('2026-12-25T18:29:59.999Z')})
  })
  it('rolls into the next year', () => {
    expect(nextIssueSchedule(Date.parse('2026-12-26T12:00:00Z'))).toMatchObject({issue:'February 2027',cutoff:'January 25, 2027'})
  })
  it('starts subscriptions bought after the 25th in the following monthly cycle', () => {
    expect(new Date(subscriptionCycleStartAt(Date.parse('2027-01-26T12:00:00Z'))).toISOString()).toBe('2027-02-24T18:30:00.000Z')
    expect(new Date(firstEditionTimestamp(Date.parse('2026-12-26T12:00:00Z'))).toISOString()).toBe('2027-01-25T04:30:00.000Z')
  })
})


it.each([[1,'2026-11-30T18:30:00Z'],[3,'2027-01-31T18:30:00Z'],[12,'2027-10-31T18:30:00Z']])('launch term renews after %i complete monthly editions',(months,end)=>{
  expect(novemberLaunchTerm(Date.parse('2026-10-02T12:00:00Z'),Number(months))).toEqual({start:Date.parse('2026-10-31T18:30:00Z'),end:Date.parse(String(end)),dispatch:Date.parse('2026-11-25T04:30:00Z')})
})
it('does not change ordinary billing terms after the launch month',()=>{
  expect(novemberLaunchTerm(Date.parse('2026-10-31T18:30:00Z'),3)).toBeNull()
})
