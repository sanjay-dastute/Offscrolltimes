import { WHATSAPP_URL, whatsappEnquiryMessage } from '#/content/site';

/**
 * Fixed, on every page that renders <SiteHeader>. Deliberately absent from
 * the checkout template (a separate, protected file that never imports this)
 * so it can never sit over the payment form. Bottom-right and modestly
 * sized so it clears a bottom mobile nav or cookie bar if either is added
 * later; raise --whatsapp-float-offset from a page if one needs the room.
 */
export function WhatsAppFloat() {
  const href = `${WHATSAPP_URL.split("?")[0]}?text=${encodeURIComponent(whatsappEnquiryMessage(""))}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on WhatsApp"
      className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-graphite bg-[#25D366] text-paper shadow-[3px_3px_0_rgba(23,21,18,0.25)] transition-transform hover:scale-105 print:hidden"
      style={{ bottom: "calc(var(--whatsapp-float-offset, 1.25rem) + env(safe-area-inset-bottom, 0px))" }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.33 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.23h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm5.83 14.24c-.25.7-1.24 1.28-2.02 1.44-.54.11-1.24.2-3.6-.77-3.02-1.25-4.96-4.31-5.11-4.51-.15-.2-1.22-1.62-1.22-3.1 0-1.47.77-2.19 1.05-2.49.27-.3.6-.37.8-.37.2 0 .4.002.57.01.18.008.43-.07.67.51.25.6.85 2.08.92 2.23.07.15.12.33.02.53-.1.2-.15.32-.3.5-.15.18-.31.4-.44.53-.15.15-.3.31-.13.6.17.3.76 1.26 1.64 2.04 1.13.99 2.08 1.3 2.38 1.45.3.15.47.12.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.65-.15.27.1 1.72.81 2.01.96.3.15.49.22.56.35.07.13.07.75-.18 1.45z" />
      </svg>
    </a>
  );
}
