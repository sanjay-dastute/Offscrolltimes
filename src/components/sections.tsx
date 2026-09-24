import {
  HOW_IT_WORKS,
  PLANS,
  PREVIEW_CLIPS,
  SAMPLE_PAGES,
  SUBSCRIBE_HREF,
  TESTIMONIALS,
  WHATS_INSIDE,
  WHO_FOR,
  WHY_LOVE,
} from '#/content/site';
import { Reveal } from '#/components/Reveal';
import { FlipBook } from '#/components/FlipBook';
import { CTA, CTA_OUTLINE, EYEBROW, H2, SHELL, scallop } from '#/lib/uiKit';

function IssueMockup() {
  return (
    <div className="interactive-newspaper border border-graphite bg-paper-raised shadow-[8px_8px_0_rgba(23,21,18,0.14)]">
      <div className="flex items-center justify-between border-b-2 border-graphite px-4 py-3">
        <span className="font-mono text-[10.5px] tracking-[0.14em] text-graphite-mute uppercase">
          All puzzles &amp; games
        </span>
        <span className="bg-founder px-1.5 py-[3px] font-mono text-[10.5px] font-bold tracking-[0.12em] text-graphite uppercase">
          Issue No. 01
        </span>
      </div>
      <div className="px-4 py-6 text-center">
        <p className="m-0 font-display text-[2rem] leading-[0.95] font-bold tracking-[-0.02em] sm:text-[2.6rem]">
          THE
          <br />
          PUZZLE
          <br />
          POST
        </p>
      </div>
      <div className="grid grid-cols-3 gap-px border-t-2 border-graphite bg-graphite">
        {["Crossword", "Sudoku", "Trivia", "Word search", "Maze", "Fun facts"].map((tile) => (
          <div key={tile} className="bg-paper px-2 py-3.5 text-center">
            <span className="font-mono text-[9.5px] font-semibold tracking-[0.06em] text-graphite-soft uppercase">
              {tile}
            </span>
          </div>
        ))}
      </div>
      <p className="m-0 border-t border-graphite px-4 py-2.5 text-center font-mono text-[10px] tracking-[0.08em] text-graphite-mute uppercase">
        Mockup. Puzzles inside are the real thing.
      </p>
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="scallop-bottom border-b border-graphite bg-sun"
      style={scallop("var(--color-sun)")}
    >
      <div
        className={`${SHELL} grid items-center gap-10 py-14 pb-16 md:grid-cols-2 md:gap-16 md:py-20 md:pb-24 lg:py-24 lg:pb-28`}
      >
        <div className="hero-reveal text-center md:text-left">
          <p className={`${EYEBROW} text-graphite`}>A fresh issue every month</p>
          <h1 className="m-0 font-display text-[clamp(2.3rem,6.4vw,3.8rem)] leading-[0.98] font-bold tracking-[-0.03em] text-balance">
            A monthly newspaper full of puzzles, games and fun facts.
          </h1>
          <p className="mx-auto mt-6 max-w-[46ch] text-[clamp(1.02rem,1.5vw,1.16rem)] leading-relaxed text-graphite-soft text-pretty md:mx-0">
            Every issue brings fresh crosswords, brain teasers, family games and local trivia
            straight to your door. Twenty plus activities, zero screens, an hour of real fun.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:justify-start">
            <a href="#plans" className={CTA}>
              Choose your subscription
            </a>
            <a href="#whats-inside" className="text-[14.5px] text-graphite-soft underline">
              See what is inside
            </a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 md:justify-start" aria-label="Publication details">
            <span className="rounded-full border border-graphite bg-paper-raised px-3 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.08em] uppercase">
              Monthly print edition
            </span>
            <span className="rounded-full border border-graphite bg-paper-raised px-3 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.08em] uppercase">
              India + selected Europe
            </span>
          </div>
        </div>

        <div className="hero-reveal hero-reveal-delay mx-auto w-full max-w-[360px]">
          <IssueMockup />
        </div>
      </div>
    </section>
  );
}

export function WhatsInside() {
  return (
    <section id="whats-inside" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>What's inside</p>
        <h2 className={`${H2} max-w-[22ch]`}>Every issue, packed cover to cover.</h2>

        <div className="mt-10 grid grid-cols-2 gap-px border border-graphite bg-graphite md:mt-14 md:grid-cols-4">
          {WHATS_INSIDE.map((item) => (
            <div key={item.label} className="flex flex-col gap-2 bg-paper-raised p-6 md:p-8">
              <span className="font-display text-[clamp(2rem,3.4vw,2.6rem)] leading-none font-bold tracking-[-0.02em] text-founder-deep">
                {item.stat}
              </span>
              <span className="leading-snug text-graphite-soft">{item.label}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function ProductPreview() {
  return (
    <section id="preview" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>A peek inside</p>
        <h2 className={`${H2} max-w-[24ch]`}>
          A taste of this month's puzzles. The rest is inside your copy.
        </h2>

        <div className="mt-10 grid items-center gap-12 md:mt-14 lg:grid-cols-[0.9fr_1.1fr]">
          <FlipBook pages={SAMPLE_PAGES} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {PREVIEW_CLIPS.map((clip) => (
              <article
                key={clip.key}
                className={`${clip.rotate} border border-graphite bg-paper-raised p-5 shadow-[5px_5px_0_rgba(23,21,18,0.12)] transition-transform duration-200 hover:rotate-0`}
              >
                <p className="m-0 mb-3 font-mono text-[10.5px] font-bold tracking-[0.12em] text-founder-deep uppercase">
                  {clip.label}
                </p>
                <p className="m-0 leading-relaxed text-graphite-soft">{clip.teaser}</p>
              </article>
            ))}
            <p className="m-0 sm:col-span-2 font-mono text-[10.5px] leading-relaxed tracking-[0.06em] text-graphite-mute uppercase">
              Preview pages are intentionally incomplete so answers stay inside the printed issue.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function WhyLove() {
  return (
    <section
      id="why-love"
      className="scallop-top scallop-bottom scroll-mt-24 bg-sun"
      style={scallop("var(--color-sun)")}
    >
      <Reveal className={`${SHELL} py-16 md:py-24`}>
        <p className={`${EYEBROW} text-center text-graphite`}>Why customers love it</p>
        <h2 className={`${H2} mx-auto max-w-[20ch] text-center text-balance`}>
          A small monthly ritual worth looking forward to.
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
          {WHY_LOVE.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-graphite bg-paper-raised p-7 shadow-[6px_6px_0_rgba(23,21,18,0.14)]"
            >
              <h3 className="m-0 mb-3 font-display text-[1.25rem] leading-tight font-bold tracking-[-0.015em]">
                {item.title}
              </h3>
              <p className="m-0 leading-relaxed text-graphite-soft">{item.body}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>How it works</p>
        <h2 className={`${H2} mb-9 md:mb-13`}>From checkout to your coffee table.</h2>

        <ol className="m-0 grid list-none gap-0 border-t border-graphite p-0 md:grid-cols-2">
          {HOW_IT_WORKS.map((step, i) => (
            <li
              key={step.num}
              className={`flex items-start gap-4 py-6 md:p-8 ${
                i % 2 === 0 ? "md:border-r md:border-rule" : ""
              } ${i < HOW_IT_WORKS.length - 2 ? "border-b border-rule md:border-b-0" : ""} ${
                i >= HOW_IT_WORKS.length - 2 ? "md:border-t md:border-rule" : ""
              }`}
            >
              <span className="font-mono text-[13px] font-bold tracking-[0.1em] text-founder-deep">
                {step.num}
              </span>
              <div>
                <h3 className="m-0 mb-1.5 font-display text-[1.15rem] leading-tight font-bold tracking-[-0.015em]">
                  {step.title}
                </h3>
                <p className="m-0 max-w-[48ch] leading-relaxed text-graphite-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

export function Plans() {
  return (
    <section id="plans" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-center text-graphite-mute`}>Subscription plans</p>
        <h2 className={`${H2} mx-auto max-w-[20ch] text-center text-balance`}>
          Choose how often your puzzles arrive.
        </h2>

        <div className="mt-10 grid gap-6 md:mt-14 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <article
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border p-7 md:p-8 ${
                plan.best
                  ? "border-2 border-graphite bg-sun shadow-[8px_8px_0_rgba(23,21,18,0.2)] md:-translate-y-2"
                  : "border-graphite bg-paper-raised shadow-[6px_6px_0_rgba(23,21,18,0.12)]"
              }`}
            >
              {plan.best && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rotate-[-2deg] rounded-full border border-graphite bg-graphite px-3.5 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.12em] text-paper uppercase">
                  Best value
                </span>
              )}
              <h3 className="m-0 font-display text-[1.4rem] font-bold tracking-[-0.02em]">
                {plan.name}
              </h3>
              <p className="m-0 mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-[2.2rem] leading-none font-bold tracking-[-0.02em]">
                  {plan.price}
                </span>
                <span className="font-mono text-[12px] tracking-[0.04em] text-graphite-mute">
                  {plan.period}
                </span>
              </p>
              {plan.monthlyEquivalent && (
                <p className="m-0 mt-1 font-mono text-[11.5px] tracking-[0.04em] text-founder-deep">
                  {plan.monthlyEquivalent}
                </p>
              )}
              <p className="m-0 mt-4 flex-1 leading-relaxed text-graphite-soft">{plan.blurb}</p>
              <a
                href={`/checkout/razorpay?duration=${plan.planId}&quantity=1&country=IN${plan.promotion ? `&code=${plan.promotion}` : ""}`}
                className={`mt-6 text-center ${plan.best ? CTA : CTA_OUTLINE}`}
              >
                Choose {plan.name}
              </a>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center font-mono text-[11px] tracking-[0.08em] text-graphite-mute uppercase">
          Prices shown in INR. Free delivery across India. Renewal is manual.
        </p>
        <p className="mt-3 text-center">
          <a
            href="/subscription"
            className="font-mono text-[12.5px] font-semibold tracking-[0.06em] text-graphite-soft uppercase underline"
          >
            Full plan details, sample issue &amp; subscription FAQ
          </a>
        </p>
      </Reveal>
    </section>
  );
}

export function WhoFor() {
  return (
    <section
      id="who-for"
      className="scallop-top scallop-bottom scroll-mt-24 bg-teal"
      style={scallop("var(--color-teal)")}
    >
      <Reveal className={`${SHELL} py-16 md:py-24`}>
        <p className={`${EYEBROW} text-center text-paper`}>Who it's for</p>
        <h2 className={`${H2} mx-auto max-w-[18ch] text-center text-balance text-paper`}>
          Built for anyone who wants a real break.
        </h2>

        <div className="mt-10 flex flex-wrap justify-center gap-5 md:mt-14">
          {WHO_FOR.map((item) => (
            <article
              key={item.key}
              className="w-full max-w-[280px] rounded-2xl border-2 border-graphite bg-paper-raised p-6 text-center shadow-[6px_6px_0_rgba(23,21,18,0.22)] sm:w-[45%] lg:w-[18%]"
            >
              <h3 className="m-0 mb-2 font-display text-[1.15rem] font-bold tracking-[-0.01em]">
                {item.key}
              </h3>
              <p className="m-0 leading-relaxed text-graphite-soft">{item.body}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function SubscriptionPrompt() {
  return (
    <section className="border-b border-graphite bg-founder text-paper">
      <Reveal className={`${SHELL} flex flex-col items-center justify-between gap-6 py-10 text-center md:flex-row md:py-12 md:text-left`}>
        <div>
          <p className="m-0 font-mono text-[11px] font-bold tracking-[0.14em] uppercase">Your next screen-free hour</p>
          <h2 className="m-0 mt-2 font-display text-[clamp(1.7rem,4vw,2.6rem)] leading-none font-bold tracking-[-0.03em]">
            Pick a plan. We will handle the post.
          </h2>
        </div>
        <a href="#plans" className="stamp shrink-0 border border-graphite bg-live px-6 py-3.5 font-mono text-[12px] font-bold tracking-[0.08em] text-graphite uppercase no-underline">
          Choose your subscription
        </a>
      </Reveal>
    </section>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>What early readers say</p>
        <h2 className={`${H2} max-w-[22ch]`}>Beta-reader feedback, ahead of public launch.</h2>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-graphite-soft">
          These are early reactions from the beta readers who tried our first issues, not verified
          customer reviews. We'll add verified reviews here once the first public batch ships.
        </p>

        <div className="mt-9 grid gap-6 md:mt-12 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="m-0 flex flex-col gap-4 rounded-2xl border border-graphite bg-paper-raised p-7"
            >
              <blockquote className="m-0 leading-relaxed text-graphite italic">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-graphite bg-sun font-mono text-[11px] font-bold text-graphite"
                >
                  {t.initials}
                </span>
                <span>
                  <span className="block font-display text-[0.95rem] font-bold tracking-[-0.01em]">
                    {t.name}
                  </span>
                  <span className="block font-mono text-[10.5px] tracking-[0.06em] text-graphite-mute uppercase">
                    {t.role}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="scallop-top bg-sun" style={scallop("var(--color-sun)")}>
      <Reveal className={`${SHELL} flex flex-col items-center gap-6 py-16 text-center md:py-24`}>
        <p className={`${EYEBROW} text-graphite`}>Ready when you are</p>
        <h2 className="m-0 max-w-[20ch] font-display text-[clamp(1.9rem,4.8vw,3rem)] leading-[1.02] font-bold tracking-[-0.03em] text-balance">
          Put something worth opening through your letterbox.
        </h2>
        <p className="m-0 max-w-[48ch] leading-relaxed text-graphite-soft">
          Choose a duration and receive a fresh puzzle newspaper every month. No inbox clutter, no marketing opt-in.
        </p>
        <a href={SUBSCRIBE_HREF} className={`${CTA} mt-2`}>
          Choose your subscription
        </a>
      </Reveal>
    </section>
  );
}
