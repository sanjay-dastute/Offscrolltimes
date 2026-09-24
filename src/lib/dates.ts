/**
 * Marketing estimate for when a new subscriber's first issue ships. Print
 * runs lock in around the 20th of the month, so an order placed after that
 * misses the very next run.
 */
export function firstEditionDate(now: Date = new Date()): Date {
  const monthsAhead = now.getDate() > 20 ? 2 : 1;
  return new Date(now.getFullYear(), now.getMonth() + monthsAhead, 5);
}

function zonedParts(at:number,timeZone:string){const values=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));const part=(type:string)=>Number(values.find(value=>value.type===type)?.value);return{year:part('year'),month:part('month'),day:part('day'),hour:part('hour'),minute:part('minute'),second:part('second')}}
function zonedTime(year:number,month:number,day:number,hour:number,timeZone:string){let guess=Date.UTC(year,month-1,day,hour);for(let index=0;index<3;index++){const actual=zonedParts(guess,timeZone),wanted=Date.UTC(year,month-1,day,hour),seen=Date.UTC(actual.year,actual.month-1,actual.day,actual.hour,actual.minute,actual.second);guess+=wanted-seen}return guess}

/** UTC timestamp for the first dispatch, derived from the configured business timezone. */
export function firstEditionTimestamp(now=Date.now(),timeZone='Asia/Kolkata',cutoffDay=20){
  const local=zonedParts(now,timeZone),monthsAhead=local.day>cutoffDay?2:1
  const target=new Date(Date.UTC(local.year,local.month-1+monthsAhead,1))
  return zonedTime(target.getUTCFullYear(),target.getUTCMonth()+1,5,10,timeZone)
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
