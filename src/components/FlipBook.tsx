import { useEffect, useRef, useState } from "react";

export type FlipPage = {
  key: string;
  label: string;
  heading: string;
  tiles: readonly string[];
};

function PageFace({ page }: { page: FlipPage }) {
  return (
    <div className="absolute inset-0 flex flex-col border-2 border-graphite bg-paper-raised [backface-visibility:hidden]">
      <div className="flex items-center justify-between border-b-2 border-graphite px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.12em] text-graphite-mute uppercase">
          {page.label}
        </span>
        <span className="bg-founder px-1.5 py-[2px] font-mono text-[9.5px] font-bold tracking-[0.1em] text-graphite uppercase">
          Sample
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-6 text-center">
        <p className="m-0 font-display text-[1.7rem] leading-[0.98] font-bold tracking-[-0.02em] whitespace-pre-line">
          {page.heading}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px border-t-2 border-graphite bg-graphite">
        {page.tiles.map((tile) => (
          <div key={tile} className="bg-paper px-2 py-3 text-center">
            <span className="font-mono text-[9px] font-semibold tracking-[0.05em] text-graphite-soft uppercase">
              {tile}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type Anim = { dir: "next" | "prev"; animating: FlipPage; baseOverride?: FlipPage };

/**
 * A small book: one page shown at a time, turned like a real newspaper page
 * rather than swapped or slid. Only the page actually being turned animates
 * — the page it reveals sits flat and static underneath the whole time.
 */
export function FlipBook({ pages }: { pages: readonly FlipPage[] }) {
  const [index, setIndex] = useState(0);
  const [anim, setAnim] = useState<Anim | null>(null);
  const [turned, setTurned] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const atStart = index === 0;
  const atEnd = index === pages.length - 1;

  function goNext() {
    if (anim || atEnd) return;
    setAnim({ dir: "next", animating: pages[index] });
    setIndex((i) => i + 1);
  }

  function goPrev() {
    if (anim || atStart) return;
    setAnim({ dir: "prev", animating: pages[index - 1], baseOverride: pages[index] });
    setIndex((i) => i - 1);
  }

  // Mounts the turning page at its start angle, then flips to the end angle
  // on a later paint so the browser actually animates the transition
  // instead of snapping straight to the end state.
  const innerRaf = useRef<number | null>(null);
  useEffect(() => {
    if (!anim) return;
    setTurned(false);
    const outerRaf = requestAnimationFrame(() => {
      innerRaf.current = requestAnimationFrame(() => setTurned(true));
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      if (innerRaf.current) cancelAnimationFrame(innerRaf.current);
    };
  }, [anim]);

  function handleTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== "transform" || event.target !== event.currentTarget) return;
    setAnim(null);
    setTurned(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") goNext();
    if (event.key === "ArrowLeft") goPrev();
  }

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    if (delta < -40) goNext();
    if (delta > 40) goPrev();
    touchStartX.current = null;
  }

  const baseDisplay = anim?.dir === "prev" && anim.baseOverride ? anim.baseOverride : pages[index];
  // next: 0deg (flat, covering) -> -180deg (turned away, revealing base).
  // prev: -180deg (turned away) -> 0deg (swings back, covering base).
  const angle = anim ? (anim.dir === "next" ? (turned ? -180 : 0) : turned ? 0 : -180) : 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="rounded-[28px] border-2 border-graphite bg-graphite p-3 shadow-[10px_10px_0_rgba(23,21,18,0.16)] sm:p-4">
        <div
          role="group"
          aria-label={`Sample issue viewer, page ${index + 1} of ${pages.length}`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="relative aspect-[3/4] w-[min(260px,calc(100vw-88px))] outline-none [perspective:1800px] focus-visible:outline-2 focus-visible:outline-sun sm:w-[300px]"
        >
          <PageFace page={baseDisplay} />

          {anim && (
            <div
              onTransitionEnd={handleTransitionEnd}
              className="flip-turn absolute inset-0 z-10 origin-left [transform-style:preserve-3d] will-change-transform"
              style={{
                transform: `rotateY(${angle}deg)`,
                transition: "transform 650ms cubic-bezier(0.4, 0.1, 0.2, 1)",
              }}
            >
              <PageFace page={anim.animating} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-transparent [backface-visibility:hidden]" />
            </div>
          )}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/10 to-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={goPrev}
          disabled={atStart}
          aria-label="Previous page"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-graphite bg-paper-raised font-display text-[1.1rem] text-graphite transition-opacity disabled:opacity-30"
        >
          &#8249;
        </button>

        <div className="flex items-center gap-2" aria-hidden="true">
          {pages.map((page, i) => (
            <span
              key={page.key}
              className={`h-2.5 w-2.5 rounded-full border border-graphite transition-colors ${
                i === index ? "bg-founder" : "bg-paper-raised"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={atEnd}
          aria-label="Next page"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-graphite bg-paper-raised font-display text-[1.1rem] text-graphite transition-opacity disabled:opacity-30"
        >
          &#8250;
        </button>
      </div>
      <p className="m-0 font-mono text-[10px] tracking-[0.06em] text-graphite-mute uppercase">
        Page {index + 1} of {pages.length} · swipe, click the arrows, or use ← →
      </p>
    </div>
  );
}
