import { useEffect, useState } from "react";
import {
  CANCELLATION_INFO,
  CURRENCY_OPTIONS,
  EDITION_PUZZLE_TYPES,
  GIFT_INFO,
  PLANS,
  SAMPLE_PAGES,
  SHIPPING_INFO,
  SUBSCRIPTION_FAQ,
  SUBSCRIPTION_INTRO,
  WHATS_INSIDE,
} from '#/content/site';
import { Reveal } from '#/components/Reveal';
import { FlipBook } from '#/components/FlipBook';
import { CTA, EYEBROW, H2, SHELL, scallop } from '#/lib/uiKit';
import { firstEditionDate, formatLongDate } from '#/lib/dates';

type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];

function guessCurrency(): CurrencyCode {
  return "INR";
}

function formatCurrency(amountUsd: number, code: CurrencyCode): string {
  const option = CURRENCY_OPTIONS.find((c) => c.code === code) ?? CURRENCY_OPTIONS[0];
  const converted = amountUsd * option.perUsd;
  const decimals = 0;
  return `${option.symbol}${converted.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function SubscriptionHero() {
  return (
    <section className="border-b border-graphite bg-paper">
      <div className={`${SHELL} py-14 md:py-20`}>
        <p className={`${EYEBROW} text-graphite-mute`}>{SUBSCRIPTION_INTRO.eyebrow}</p>
        <h1 className="m-0 max-w-[22ch] font-display text-[clamp(2.3rem,6vw,3.8rem)] leading-[0.98] font-bold tracking-[-0.03em] text-balance">
          {SUBSCRIPTION_INTRO.title}
        </h1>
        <p className="mt-6 max-w-[62ch] text-[clamp(1.02rem,1.5vw,1.16rem)] leading-relaxed text-graphite-soft text-pretty">
          {SUBSCRIPTION_INTRO.body}
        </p>
      </div>
    </section>
  );
}

export function SubscriptionPlans() {
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(PLANS.map((p) => [p.key, 1])),
  );
  const shipDate = formatLongDate(firstEditionDate());

  useEffect(() => {
    setCurrency(guessCurrency());
  }, []);

  function setQuantity(key: string, value: number) {
    const clamped = Math.min(10, Math.max(1, Math.floor(value) || 1));
    setQuantities((prev) => ({ ...prev, [key]: clamped }));
  }

  return (
    <section id="plans" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className={`${EYEBROW} text-graphite-mute`}>Pricing</p>
            <h2 className={H2}>Simple plans, free India delivery.</h2>
          </div>

          <label className="flex items-center gap-2.5 font-mono text-[11.5px] tracking-[0.08em] text-graphite-mute uppercase">
            Show prices in
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              className="rounded-full border border-graphite bg-paper-raised px-3 py-2 text-graphite outline-none"
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 font-mono text-[11px] tracking-[0.06em] text-graphite-mute uppercase">
          Prices are in Indian rupees. Payment covers the selected prepaid term and renewal is manual.
        </p>

        <div className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const quantity = quantities[plan.key] ?? 1;
            const total = plan.priceUsd * quantity;
            const checkoutHref =
              quantity > 1
                ? `/checkout/razorpay?duration=${plan.planId}&quantity=${quantity}&country=IN${plan.promotion ? `&code=${plan.promotion}` : ""}`
                : `/checkout/razorpay?duration=${plan.planId}&quantity=1&country=IN${plan.promotion ? `&code=${plan.promotion}` : ""}`;

            return (
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
                  <span className="font-display text-[2.1rem] leading-none font-bold tracking-[-0.02em]">
                    {formatCurrency(total, currency)}
                  </span>
                  <span className="font-mono text-[12px] tracking-[0.04em] text-graphite-mute">
                    {plan.period}
                    {quantity > 1 ? ` × ${quantity}` : ""}
                  </span>
                </p>

                <dl className="m-0 mt-5 flex flex-col gap-2 border-t border-graphite pt-4 font-mono text-[11px] tracking-[0.04em] text-graphite-soft uppercase">
                  <div className="flex justify-between gap-3">
                    <dt>Renews</dt>
                    <dd className="m-0 text-right text-graphite">{plan.renewsEvery}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>First issue ships</dt>
                    <dd className="m-0 text-right text-graphite">{shipDate}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Cancel</dt>
                    <dd className="m-0 text-right text-graphite">Manual renewal from your account</dd>
                  </div>
                </dl>

                <p className="m-0 mt-4 flex-1 leading-relaxed text-graphite-soft">{plan.blurb}</p>

                <label className="mt-5 flex items-center justify-between gap-3 font-mono text-[11px] tracking-[0.06em] text-graphite-mute uppercase">
                  Copies
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={quantity}
                    onChange={(event) => setQuantity(plan.key, Number(event.target.value))}
                    className="w-16 rounded-full border border-graphite bg-paper px-3 py-1.5 text-center text-[13px] text-graphite outline-none"
                  />
                </label>

                <a href={checkoutHref} className={`mt-5 text-center ${CTA}`}>
                  Choose {plan.name}
                </a>
              </article>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

export function SampleIssueGallery() {
  return (
    <section id="sample-issue" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>Sample issue</p>
        <h2 className={`${H2} max-w-[24ch]`}>A quick look inside, page by page.</h2>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-graphite-soft">
          Turn through a mock issue like the real paper one. We keep full puzzles for
          subscribers, so answers stay a surprise.
        </p>

        <div className="mt-10 md:mt-12">
          <FlipBook pages={SAMPLE_PAGES} />
        </div>
      </Reveal>
    </section>
  );
}

export function EditionContents() {
  return (
    <section id="whats-inside" className="scallop-top scallop-bottom scroll-mt-24 bg-sun" style={scallop("var(--color-sun)")}>
      <Reveal className={`${SHELL} py-16 md:py-24`}>
        <p className={`${EYEBROW} text-center text-graphite`}>What every edition contains</p>
        <h2 className={`${H2} mx-auto max-w-[22ch] text-center text-balance`}>
          The same promise, every single issue.
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-px border border-graphite bg-graphite md:mt-14 md:grid-cols-4">
          {WHATS_INSIDE.map((item) => (
            <div key={item.label} className="flex flex-col gap-2 bg-paper-raised p-6 md:p-8">
              <span className="font-display text-[clamp(1.8rem,3vw,2.3rem)] leading-none font-bold tracking-[-0.02em] text-founder-deep">
                {item.stat}
              </span>
              <span className="leading-snug text-graphite-soft">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {EDITION_PUZZLE_TYPES.map((type) => (
            <span
              key={type}
              className="rounded-full border border-graphite bg-paper-raised px-4 py-2 font-mono text-[11px] tracking-[0.06em] text-graphite uppercase"
            >
              {type}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function ShippingCancellationGift() {
  return (
    <section className="border-b border-graphite bg-paper">
      <Reveal className={`${SHELL} grid gap-8 py-14 md:grid-cols-3 md:py-20 lg:py-24`}>
        <div>
          <p className={`${EYEBROW} text-graphite-mute`}>Shipping</p>
          <p className="m-0 leading-relaxed text-graphite-soft">{SHIPPING_INFO.cost}</p>
          <p className="m-0 mt-3 leading-relaxed text-graphite-soft">{SHIPPING_INFO.estimate}</p>
        </div>
        <div>
          <p className={`${EYEBROW} text-graphite-mute`}>Pause or cancel</p>
          <p className="m-0 leading-relaxed text-graphite-soft">{CANCELLATION_INFO.cancel}</p>
          <p className="m-0 mt-3 leading-relaxed text-graphite-soft">{CANCELLATION_INFO.pause}</p>
        </div>
        <div>
          <p className={`${EYEBROW} text-graphite-mute`}>Buying as a gift</p>
          <p className="m-0 leading-relaxed text-graphite-soft">{GIFT_INFO.body}</p>
          <p className="m-0 mt-3 leading-relaxed text-graphite-soft">{GIFT_INFO.note}</p>
        </div>
      </Reveal>
    </section>
  );
}

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

export function SubscriptionFaq() {
  return (
    <section id="faq" className="border-b border-graphite bg-paper scroll-mt-24">
      <Reveal className={`${SHELL} py-14 md:py-20 lg:py-24`}>
        <p className={`${EYEBROW} text-graphite-mute`}>Subscription FAQ</p>
        <h2 className={`${H2} mb-8 md:mb-11`}>Price, renewal and cancellation, in plain terms.</h2>

        <div className="max-w-[900px] rounded-2xl border border-graphite bg-paper-raised px-6">
          {SUBSCRIPTION_FAQ.map((item, i) => (
            <details key={item.q} className={i === SUBSCRIPTION_FAQ.length - 1 ? "" : "border-b border-rule"}>
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
