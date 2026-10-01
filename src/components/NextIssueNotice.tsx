import { useEffect, useState } from 'react';
import { nextIssueSchedule } from '#/lib/dates';
import { SUBSCRIBE_HREF } from '#/content/site';



export function NextIssueNotice() {
  const [schedule, setSchedule] = useState(() => nextIssueSchedule());
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => { const now = Date.now(); const next = nextIssueSchedule(now); setSchedule(next); setRemaining(Math.max(0, Math.ceil((next.deadline - now) / 1000))); };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const units = remaining === null ? null : [
    { label: 'Days', value: Math.floor(remaining / 86400) },
    { label: 'Hours', value: Math.floor((remaining % 86400) / 3600) },
    { label: 'Minutes', value: Math.floor((remaining % 3600) / 60) },
    { label: 'Seconds', value: remaining % 60 },
  ];

  return (
    <a
      href={SUBSCRIBE_HREF}
      className="mx-auto mt-6 block w-full max-w-[28rem] rounded-xl border-2 border-graphite bg-paper-raised p-4 text-left text-graphite no-underline shadow-[3px_3px_0_var(--color-graphite)] transition-colors hover:bg-paper hover:text-graphite md:mx-0"
      aria-labelledby="next-issue-title"
      aria-describedby="next-issue-description"
    >
      <h2 id="next-issue-title" className="m-0 font-display text-xl font-bold">Next : {schedule.issue} Issue</h2>
      <p id="next-issue-description" className="mt-3 text-sm leading-relaxed">
        Become an Offscroller by {schedule.cutoff} to receive the {schedule.issue} issue.
      </p>
      <p className="mt-3 text-sm font-semibold">Time remaining to join:</p>
      <div role="timer" aria-label={`Time remaining until the ${schedule.cutoff} joining deadline, India time`} className="mt-2">
        {remaining === 0 ? (
          <p className="font-semibold">Joining for the {schedule.issueMonth} issue has closed.</p>
        ) : units ? (
          <div className="grid max-w-[20rem] grid-cols-4 gap-2">
            {units.map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-graphite bg-sun px-1 py-2 text-center">
                <span className="block font-mono text-xl font-bold tabular-nums sm:text-2xl">{String(value).padStart(2, '0')}</span>
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-wide sm:text-[10px]">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm">Join by {schedule.cutoff}, 11:59 p.m. IST.</p>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold">
        {remaining === 0 ? 'Explore subscription options →' : `Don’t miss the ${schedule.issueMonth} issue — join before the deadline.`}
      </p>
    </a>
  );
}
