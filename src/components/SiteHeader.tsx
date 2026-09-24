import { ANNOUNCEMENT, BRAND_NAME, NAV_LINKS, SUBSCRIBE_HREF } from '#/content/site';
import { WhatsAppFloat } from '#/components/WhatsAppFloat';

export function Mark() {
  return (
    <img
      aria-hidden="true"
      alt=""
      src="/offscroll-times-logo.jpeg"
      className="h-11 w-11 rounded-lg object-cover"
      width="44"
      height="44"
    />
  );
}

export function SiteHeader() {
  const navItems = (
    <>
      {NAV_LINKS.map((link) => (
        <a
          key={link.href + link.label}
          href={link.href}
          className="rounded-sm border-b border-transparent py-1 no-underline outline-none hover:border-founder-deep focus-visible:ring-2 focus-visible:ring-founder-deep focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {link.label}
        </a>
      ))}
    </>
  );

  return (
    <>
      <div className="border-b border-graphite bg-graphite py-2 text-center">
        <p className="m-0 px-4 font-mono text-[10.5px] font-semibold tracking-[0.1em] text-paper uppercase">
          {ANNOUNCEMENT}
        </p>
      </div>

      <header className="sticky top-0 z-40 border-b border-graphite bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto grid min-h-[70px] max-w-[1180px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 sm:px-6 md:grid-cols-[auto_minmax(240px,1fr)_auto] lg:gap-x-8 lg:px-10">
          <a
            href="/"
            aria-label={`${BRAND_NAME}, home`}
            className="col-start-1 row-start-1 flex w-fit items-center gap-2.5 rounded-sm no-underline outline-none focus-visible:ring-2 focus-visible:ring-founder-deep focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <Mark />
            <span className="hidden whitespace-nowrap font-display text-[17px] font-bold tracking-[-0.02em] sm:inline sm:text-[19px]">
              {BRAND_NAME}
            </span>
          </a>

          <nav
            aria-label="Primary"
            className="col-start-2 row-start-1 hidden items-center justify-center gap-4 font-mono text-[10px] font-semibold tracking-[0.06em] uppercase lg:flex xl:gap-6 xl:text-[11px]"
          >
            {navItems}
          </nav>

          <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-2 md:col-start-3">
            <a href="/account" aria-label="Sign in or open your customer account" className="hidden rounded-full border border-graphite px-3 py-2.5 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase no-underline outline-none hover:bg-cream focus-visible:ring-2 focus-visible:ring-founder-deep focus-visible:ring-offset-2 sm:inline-block">Account</a>
            <a
              href={SUBSCRIBE_HREF}
              className="rounded-full border border-graphite bg-graphite px-3 py-2.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-paper uppercase no-underline outline-none transition-colors hover:bg-sun hover:text-graphite focus-visible:ring-2 focus-visible:ring-founder-deep focus-visible:ring-offset-2 sm:px-4 sm:text-[11.5px]"
            >
              <span className="hidden sm:inline">Choose your subscription</span><span className="sm:hidden">Choose plan</span>
            </a>
          </div>

          <details className="group col-span-2 row-start-2 mt-3 border-t border-rule pt-2 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-1 py-2 font-mono text-[11.5px] font-semibold tracking-[0.1em] uppercase outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-founder-deep">
              <span>Menu</span>
              <span aria-hidden="true" className="text-lg leading-none group-open:rotate-45">+</span>
            </summary>
            <nav aria-label="Mobile primary" className="grid grid-cols-2 gap-x-5 gap-y-3 px-1 pb-3 pt-2 font-mono text-[11.5px] tracking-[0.08em] uppercase">
              {navItems}
              <a href="/account" className="rounded-sm border-b border-transparent py-1 no-underline outline-none hover:border-founder-deep focus-visible:ring-2 focus-visible:ring-founder-deep">
                Account / Sign in
              </a>
            </nav>
          </details>
        </div>
      </header>

      <WhatsAppFloat />
    </>
  );
}
