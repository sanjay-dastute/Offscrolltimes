/**
 * Marketing estimate for when a new subscriber's first issue ships. Print
 * runs lock in around the 20th of the month, so an order placed after that
 * misses the very next run.
 */
export function firstEditionDate(now: Date = new Date()): Date {
  return new Date(firstEditionTimestamp(now.getTime()));
}

function zonedParts(at:number,timeZone:string){const values=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));const part=(type:string)=>Number(values.find(value=>value.type===type)?.value);return{year:part('year'),month:part('month'),day:part('day'),hour:part('hour'),minute:part('minute'),second:part('second')}}
function zonedTime(year:number,month:number,day:number,hour:number,timeZone:string){let guess=Date.UTC(year,month-1,day,hour);for(let index=0;index<3;index++){const actual=zonedParts(guess,timeZone),wanted=Date.UTC(year,month-1,day,hour),seen=Date.UTC(actual.year,actual.month-1,actual.day,actual.hour,actual.minute,actual.second);guess+=wanted-seen}return guess}

/** October launch purchases pay now for complete monthly editions starting November 1. */
export function novemberLaunchTerm(paidAt:number,months:number) {
  const start=zonedTime(2026,11,1,0,'Asia/Kolkata')
  if(paidAt<zonedTime(2026,10,1,0,'Asia/Kolkata')||paidAt>=start)return null
  const target=new Date(Date.UTC(2026,10+months,1))
  return {start,end:zonedTime(target.getUTCFullYear(),target.getUTCMonth()+1,1,0,'Asia/Kolkata'),dispatch:zonedTime(2026,11,25,10,'Asia/Kolkata')}
}

export function editionDispatchForTerm(start:number) {
  const local=zonedParts(start,'Asia/Kolkata')
  return zonedTime(local.year,local.month,25,10,'Asia/Kolkata')
}

/** UTC timestamp for the first dispatch, derived from the configured business timezone. */
export function firstEditionTimestamp(now=Date.now(),timeZone='Asia/Kolkata',cutoffDay=20){
  const local=zonedParts(now,timeZone),monthsAhead=local.day>cutoffDay?2:1
  const target=new Date(Date.UTC(local.year,local.month-1+monthsAhead,1))
  return zonedTime(target.getUTCFullYear(),target.getUTCMonth()+1,25,10,timeZone)
}

/** Matching issue and end-of-day joining deadline, rolling forward after the 20th. */
export function nextIssueSchedule(now=Date.now()) {
  const local=zonedParts(now,'Asia/Kolkata')
  const cutoffMonth=new Date(Date.UTC(local.year,local.month-1+(local.day>20?1:0),1))
  const year=cutoffMonth.getUTCFullYear(),month=cutoffMonth.getUTCMonth()+1
  const deadline=zonedTime(year,month,21,0,'Asia/Kolkata')
  const dispatch=firstEditionTimestamp(now)
  const issue=new Intl.DateTimeFormat('en',{timeZone:'Asia/Kolkata',month:'long',year:'numeric'}).format(dispatch)
  const issueMonth=new Intl.DateTimeFormat('en',{timeZone:'Asia/Kolkata',month:'long'}).format(dispatch)
  const cutoff=new Intl.DateTimeFormat('en',{timeZone:'Asia/Kolkata',month:'long',day:'numeric',year:'numeric'}).format(new Date(Date.UTC(year,month-1,20)))
  return {deadline,issue,issueMonth,cutoff}
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
