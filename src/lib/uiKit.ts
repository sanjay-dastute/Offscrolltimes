import type { CSSProperties } from "react";

export const H2 =
  "m-0 font-display font-bold tracking-[-0.03em] leading-[1.02] text-[clamp(1.9rem,4.6vw,3.1rem)]";
export const EYEBROW = "m-0 mb-5 font-mono text-[11.5px] tracking-[0.16em] uppercase";
export const SHELL = "mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-10";
export const CTA =
  "stamp inline-block rounded-full border border-graphite bg-graphite px-7 py-4 font-mono text-[13px] font-bold tracking-[0.1em] text-paper uppercase no-underline hover:bg-sun hover:text-graphite";
export const CTA_OUTLINE =
  "paper-button inline-block rounded-full border border-graphite bg-paper px-7 py-4 font-mono text-[13px] font-bold tracking-[0.1em] text-graphite uppercase no-underline transition-colors hover:bg-graphite hover:text-paper";
export const CARD = "rounded-2xl border border-graphite bg-paper-raised p-5 shadow-[3px_3px_0_var(--color-rule-soft)]";
export const FIELD = "w-full rounded-xl border border-graphite bg-paper-raised px-4 py-3 text-graphite placeholder:text-graphite-mute";
export const ALERT = "rounded-xl border border-graphite bg-sun/25 p-4 text-sm";

/** Custom-property scallop tint, typed loosely since CSSProperties has no --vars. */
export function scallop(color: string): CSSProperties {
  return { "--scallop-color": color } as CSSProperties;
}
