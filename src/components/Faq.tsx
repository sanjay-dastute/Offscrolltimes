import {
  BRAND_NAME,
  APPROVED_SOCIAL_LINKS,
  BUSINESS_DETAILS,
  CONTACT_EMAIL,
  FAQ_PREVIEW,
  FOOTER_DELIVERY_REGIONS,
  FOOTER_PAYMENT_METHODS,
  FOOTER_POLICY_LINKS,
  NAV_LINKS,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from '#/content/site';
import { Reveal } from '#/components/Reveal';

const SHELL = "mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10";

function Cross() {
  return (
    <span
      aria-hidden="true"
      className="accordion-cross relative ml-auto h-4 w-4 shrink-0 transition-transform duration-150"
    >
      <span className="absolute top-[7px] left-0 h-0.5 w-4 bg-founder-deep" />
      <span className="absolute top-0 left-[7px] h-4 w-0.5 bg-founder-deep" />
    </span>
  );
}

export function Faq() {
  return (
    <section id="faq" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className="m-0 mb-5 font-mono text-[11.5px] tracking-[0.16em] text-graphite-mute uppercase">
          FAQ
        </p>
        <h2 className="m-0 mb-8 font-display text-[clamp(1.9rem,4.6vw,3.1rem)] leading-[1.02] font-bold tracking-[-0.03em] md:mb-11">
          Answers before you start.
        </h2>

        <div className="max-w-[900px] rounded-2xl border border-graphite bg-paper-raised px-6">
          {FAQ_PREVIEW.map((item, i) => (
            <details key={item.q} className={i === FAQ_PREVIEW.length - 1 ? "" : "border-b border-rule"}>
              <summary className="flex items-center gap-5 py-5 font-display text-[clamp(1.05rem,2vw,1.3rem)] font-bold tracking-[-0.015em]">
                <span>{item.q}</span>
                <Cross />
              </summary>
              <div className="faq-answer">
                <p className="m-0 mb-6 max-w-[60ch] leading-relaxed text-graphite-soft">{item.a}</p>
              </div>
            </details>
          ))}
        </div>

        <a
          href="/faq"
          className="mt-6 inline-block font-mono text-[12.5px] font-semibold tracking-[0.06em] text-graphite-soft uppercase underline"
        >
          See the complete FAQ
        </a>
      </Reveal>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer id="contact" className="scroll-mt-24 bg-sun">
      <div className={`${SHELL} grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:gap-8 md:py-20`}>
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-graphite uppercase">
            {BRAND_NAME}
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.02em] text-graphite">SCROLL LESS PLAY MORE</span>
          <p className="m-0 max-w-[34ch] leading-relaxed text-graphite-soft">
            A monthly puzzle newspaper delivered to your door. Screen-free entertainment for
            individuals, couples and families.
          </p>
          <p className="m-0 font-mono text-[10.5px] leading-relaxed tracking-[0.04em] text-graphite-mute uppercase">{BUSINESS_DETAILS.location}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3 font-mono text-[12px] tracking-[0.08em] text-graphite uppercase">
          <span className="mb-1 text-graphite-mute">Explore</span>
          {NAV_LINKS.map((link) => (
            <a key={link.href + link.label} href={link.href} className="no-underline hover:text-founder-deep">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-3 font-mono text-[12px] tracking-[0.08em] uppercase">
          <span className="mb-1 text-graphite-mute">Support</span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-graphite no-underline hover:text-founder-deep"
          >
            WhatsApp: {WHATSAPP_NUMBER}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-graphite no-underline hover:text-founder-deep">{CONTACT_EMAIL}</a>
          {APPROVED_SOCIAL_LINKS.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="text-graphite no-underline hover:text-founder-deep">{link.label}</a>)}
          {FOOTER_POLICY_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-graphite no-underline hover:text-founder-deep">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-3 font-mono text-[12px] tracking-[0.08em] uppercase">
          <span className="mb-1 text-graphite-mute">We deliver to</span>
          <p className="m-0 normal-case tracking-normal text-graphite-soft lowercase-none">
            {FOOTER_DELIVERY_REGIONS.join(", ")}
          </p>
          <span className="mt-2 mb-1 text-graphite-mute">Payment methods</span>
          <p className="m-0 normal-case tracking-normal text-graphite-soft">
            {FOOTER_PAYMENT_METHODS.join(" · ")}
          </p>
        </div>
      </div>

      <div className="border-t border-graphite/20">
        <h2 className="m-0 select-none px-4 pt-8 text-center font-display text-[clamp(2rem,9vw,6rem)] leading-none font-bold tracking-[-0.04em] text-graphite/90">
          {BRAND_NAME.toUpperCase()}
        </h2>
        <div
          className={`${SHELL} flex flex-wrap items-center justify-center gap-x-6 gap-y-2 py-6 text-center font-mono text-[11px] tracking-[0.08em] text-graphite-soft uppercase`}
        >
          <span>&copy; 2026 {BRAND_NAME}</span>
          <span>Google/Microsoft authentication · Secure Razorpay payments</span>
        </div>
      </div>
    </footer>
  );
}
