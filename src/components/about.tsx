import {
  ABOUT_INTRO,
  BEHIND_THE_SCENES,
  PRODUCTION_PROCESS,
  SUBSCRIBE_HREF,
  TEAM_ROLES,
  WHO_WE_ARE,
  WHY_US,
} from '#/content/site';
import { Reveal } from '#/components/Reveal';
import { CTA, EYEBROW, H2, SHELL, scallop } from '#/lib/uiKit';

export function AboutHero() {
  return (
    <section className="border-b border-graphite bg-paper">
      <div className={`${SHELL} py-14 md:py-20`}>
        <p className={`${EYEBROW} text-graphite-mute`}>{ABOUT_INTRO.eyebrow}</p>
        <h1 className="m-0 max-w-[20ch] font-display text-[clamp(2.3rem,6vw,3.8rem)] leading-[0.98] font-bold tracking-[-0.03em] text-balance">
          {ABOUT_INTRO.title}
        </h1>
        <p className="mt-6 max-w-[62ch] text-[clamp(1.02rem,1.5vw,1.16rem)] leading-relaxed text-graphite-soft text-pretty">
          {ABOUT_INTRO.body}
        </p>
      </div>
    </section>
  );
}

export function WhoWeAre() {
  return (
    <section
      id="who-we-are"
      className="scallop-top scroll-mt-24 bg-sun"
      style={scallop("var(--color-sun)")}
    >
      <Reveal className={`${SHELL} grid items-start gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24`}>
        <div className="relative">
          <div className="tape relative border border-graphite bg-paper-raised p-2 shadow-[8px_8px_0_rgba(23,21,18,0.16)]">
            <img
              src={WHO_WE_ARE.image.src}
              alt={WHO_WE_ARE.image.alt}
              className="aspect-[4/3] w-full rounded-sm object-cover"
              loading="lazy"
            />
          </div>
          <p className="hand-note absolute -right-3 -bottom-6 max-w-[180px] rotate-[-4deg] text-[1.4rem] text-founder-deep sm:-right-8">
            {WHO_WE_ARE.note}
          </p>
        </div>

        <div>
          <p className={`${EYEBROW} text-graphite`}>Who we are</p>
          <div className="flex flex-col gap-5 text-[clamp(1rem,1.4vw,1.1rem)] leading-relaxed">
            {WHO_WE_ARE.paragraphs.map((paragraph) => (
              <p key={paragraph} className="m-0">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="m-0 mt-6 border-t border-graphite pt-4 font-mono text-[11.5px] tracking-[0.08em] text-graphite uppercase">
            {WHO_WE_ARE.location}
          </p>
          <div className="mt-7 grid gap-3">
            {TEAM_ROLES.map((role) => (
              <article key={role.title} className="border-l-4 border-founder bg-paper-raised px-5 py-4">
                <h3 className="m-0 font-display text-[1.05rem] font-bold">{role.title}</h3>
                <p className="m-0 mt-1.5 leading-relaxed text-graphite-soft">{role.body}</p>
              </article>
            ))}
          </div>
          <p className="m-0 mt-5 font-mono text-[10.5px] leading-relaxed tracking-[0.06em] text-graphite-mute uppercase">
            Founder names and portraits will be published after client approval.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

export function WhyUsAbout() {
  return (
    <section id="why-us" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>Why us</p>
        <h2 className={`${H2} max-w-[22ch]`}>Six things we don't compromise on.</h2>

        <div className="mt-10 grid gap-px border border-graphite bg-graphite sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
          {WHY_US.map((item) => (
            <div key={item.title} className="flex flex-col gap-2.5 bg-paper-raised p-6 md:p-7">
              <h3 className="m-0 font-display text-[1.1rem] leading-tight font-bold tracking-[-0.01em]">
                {item.title}
              </h3>
              <p className="m-0 leading-relaxed text-graphite-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function ProductionProcess() {
  return (
    <section
      id="how-it-works"
      className="scallop-top scallop-bottom scroll-mt-24 bg-sun"
      style={scallop("var(--color-sun)")}
    >
      <Reveal className={`${SHELL} py-16 md:py-24`}>
        <p className={`${EYEBROW} text-center text-graphite`}>How it works</p>
        <h2 className={`${H2} mx-auto max-w-[24ch] text-center text-balance`}>
          From a messy idea to your mailbox.
        </h2>

        <ol className="m-0 mt-10 grid list-none gap-5 p-0 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
          {PRODUCTION_PROCESS.map((step) => (
            <li
              key={step.num}
              className="rounded-2xl border border-graphite bg-paper-raised p-6 shadow-[6px_6px_0_rgba(23,21,18,0.14)] md:p-7"
            >
              <span className="font-mono text-[13px] font-bold tracking-[0.1em] text-founder-deep">
                {step.num}
              </span>
              <h3 className="m-0 mt-2 mb-2 font-display text-[1.15rem] leading-tight font-bold tracking-[-0.015em]">
                {step.title}
              </h3>
              <p className="m-0 leading-relaxed text-graphite-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

export function BehindTheScenes() {
  const rotations = ["-rotate-3", "rotate-2", "-rotate-1"];
  return (
    <section id="behind-the-scenes" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>Behind the scenes</p>
        <h2 className={`${H2} max-w-[26ch]`}>
          Every issue is prototyped, play-tested and rebuilt before it's yours.
        </h2>
        <p className="mt-4 max-w-[62ch] leading-relaxed text-graphite-soft">
          The finished newspaper is the last step, not the first. Most puzzles go through several
          rough drafts, a round of testing with people who have never seen them, and at least one
          rebuild before they earn a spot in an issue.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 md:mt-14 lg:grid-cols-3">
          {BEHIND_THE_SCENES.map((item, i) => (
            <figure key={item.image.src} className={`m-0 ${rotations[i % rotations.length]}`}>
              <div className="tape relative border border-graphite bg-paper-raised p-2 shadow-[8px_8px_0_rgba(23,21,18,0.14)] transition-transform duration-200 hover:rotate-0">
                <img
                  src={item.image.src}
                  alt={item.image.alt}
                  className="aspect-[4/3] w-full rounded-sm object-cover"
                  loading="lazy"
                />
                <span className="absolute right-4 bottom-4 border border-graphite bg-paper-raised px-2 py-1 font-mono text-[9px] font-bold tracking-[0.08em] uppercase">
                  Temporary concept image
                </span>
              </div>
              <figcaption className="hand-note mt-3 text-center text-[1.3rem] text-graphite-soft">
                {item.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function AboutCta() {
  return (
    <section className="scallop-top bg-sun" style={scallop("var(--color-sun)")}>
      <Reveal className={`${SHELL} flex flex-col items-center gap-6 py-16 text-center md:py-24`}>
        <h2 className="m-0 max-w-[20ch] font-display text-[clamp(1.9rem,4.8vw,3rem)] leading-[1.02] font-bold tracking-[-0.03em] text-balance">
          Come see what we've been testing.
        </h2>
        <a href={SUBSCRIBE_HREF} className={CTA}>
          Choose your subscription
        </a>
      </Reveal>
    </section>
  );
}
