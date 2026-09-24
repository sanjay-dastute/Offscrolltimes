import { useEffect, useRef, useState } from "react";
import { ENQUIRY_TYPES, WHATSAPP_URL, whatsappEnquiryMessage } from '#/content/site';
import { submitContactEnquiry } from '#/lib/contact/actions';
import { CTA, CTA_OUTLINE } from '#/lib/uiKit';

type EnquiryKey = (typeof ENQUIRY_TYPES)[number]["key"];

const DETAIL_FIELD: Record<EnquiryKey, { label: string; placeholder: string } | null> = {
  general: null,
  subscription: { label: "Order or membership email (if different)", placeholder: "you@example.com" },
  bulk: { label: "Estimated number of copies", placeholder: "e.g. 25" },
  partnership: { label: "Company / organisation name", placeholder: "e.g. Acme Retail" },
};

type Status = "idle" | "submitting" | "success" | "error";

export function EnquiryCards({
  selected,
  onSelect,
}: {
  selected: EnquiryKey;
  onSelect: (key: EnquiryKey) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {ENQUIRY_TYPES.map((type) => (
        <button
          key={type.key}
          type="button"
          onClick={() => onSelect(type.key)}
          className={`rounded-2xl border p-6 text-left transition-colors ${
            selected === type.key
              ? "border-2 border-graphite bg-sun shadow-[6px_6px_0_rgba(23,21,18,0.16)]"
              : "border-graphite bg-paper-raised shadow-[4px_4px_0_rgba(23,21,18,0.1)] hover:bg-sun/40"
          }`}
        >
          <h3 className="m-0 mb-2 font-display text-[1.1rem] font-bold tracking-[-0.01em]">
            {type.label}
          </h3>
          <p className="m-0 leading-relaxed text-graphite-soft">{type.description}</p>
        </button>
      ))}
    </div>
  );
}

export function ContactForm({
  enquiryType,
  onEnquiryTypeChange,
}: {
  enquiryType: EnquiryKey;
  onEnquiryTypeChange: (key: EnquiryKey) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [reference, setReference] = useState("");
  const [website, setWebsite] = useState("");
  const [startedAt] = useState(() => Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!turnstileSiteKey || document.querySelector('script[data-offscroll-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.dataset.offscrollTurnstile = 'true';
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  const detailField = DETAIL_FIELD[enquiryType];
  const whatsappHref = `${WHATSAPP_URL.split('?')[0]}?text=${encodeURIComponent(
    message ? `${whatsappEnquiryMessage(country)}\n\n${message}` : whatsappEnquiryMessage(country),
  )}`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const turnstileToken = formRef.current?.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value ?? '';
    const result = await submitContactEnquiry({
      data: { enquiryType, name, email, country, detail, message, website, startedAt, turnstileToken },
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(
        result.error === "invalid_email"
          ? "Enter a valid email address."
          : result.error === "invalid_name"
            ? "Enter your name."
            : result.error === "rate_limited"
              ? "Too many enquiries were submitted. Please try again in an hour."
              : result.error === "unavailable"
                ? "Enquiry storage is temporarily unavailable. Please use WhatsApp."
                : result.error === "spam"
                  ? "Please wait a moment and try again."
                  : "Enter a message of at least 10 characters.",
      );
      return;
    }

    setEmailSent(result.emailSent);
    setReference(result.reference);
    setStatus("success");
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-graphite bg-paper-raised p-8 text-center">
        <p className="m-0 rounded-full border border-graphite bg-sun px-4 py-2 font-mono text-[11px] font-bold tracking-[0.08em] uppercase">Reference: {reference}</p>
        {emailSent ? (
          <>
            <p className="m-0 font-display text-[1.25rem] font-bold tracking-[-0.01em]">
              Message received.
            </p>
            <p className="m-0 max-w-[46ch] leading-relaxed text-graphite-soft">
              We'll reply to {email || "your email"} within 1 business day.
            </p>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={CTA_OUTLINE}>
              Prefer an instant reply? Message us on WhatsApp
            </a>
          </>
        ) : (
          <>
            <p className="m-0 font-display text-[1.25rem] font-bold tracking-[-0.01em]">
              Message received and saved.
            </p>
            <p className="m-0 max-w-[46ch] leading-relaxed text-graphite-soft">
              Your enquiry is available to our administrators. Email notifications are not configured yet;
              for a faster reply, you can also send the same message through WhatsApp.
            </p>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={CTA}>
              Send on WhatsApp
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-graphite-soft">Your enquiry is stored for our support team and sent through FormSubmit to hello@offscrolltimes.com. Please do not include passwords or payment details. <a href="/policies/privacy" className="underline">Privacy policy</a></p>
      <label className="absolute -left-[10000px]" aria-hidden="true">
        Website
        <input type="text" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-full border border-graphite bg-paper-raised px-5 py-3.5">
        <span className="font-mono text-[11px] tracking-[0.06em] text-graphite-mute uppercase">
          What can we help with?
        </span>
        <select
          value={enquiryType}
          onChange={(event) => onEnquiryTypeChange(event.target.value as EnquiryKey)}
          className="bg-transparent text-[13px] text-graphite outline-none"
        >
          {ENQUIRY_TYPES.map((type) => (
            <option key={type.key} value={type.key}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Name</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            autoComplete="name"
            className="w-full rounded-full border border-graphite bg-paper-raised px-5 py-3.5 text-[14px] text-graphite outline-none placeholder:text-graphite-mute focus-visible:outline-2 focus-visible:outline-graphite"
          />
        </label>
        <label className="flex-1">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-full border border-graphite bg-paper-raised px-5 py-3.5 text-[14px] text-graphite outline-none placeholder:text-graphite-mute focus-visible:outline-2 focus-visible:outline-graphite"
          />
        </label>
      </div>

      <label>
        <span className="sr-only">Country</span>
        <input
          type="text"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          placeholder="Your country (e.g. India, Germany)"
          className="w-full rounded-full border border-graphite bg-paper-raised px-5 py-3.5 text-[14px] text-graphite outline-none placeholder:text-graphite-mute focus-visible:outline-2 focus-visible:outline-graphite"
        />
      </label>

      {detailField && (
        <label>
          <span className="sr-only">{detailField.label}</span>
          <input
            type="text"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder={detailField.label}
            className="w-full rounded-full border border-graphite bg-paper-raised px-5 py-3.5 text-[14px] text-graphite outline-none placeholder:text-graphite-mute focus-visible:outline-2 focus-visible:outline-graphite"
          />
        </label>
      )}

      <label>
        <span className="sr-only">Message</span>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="How can we help?"
          className="w-full rounded-2xl border border-graphite bg-paper-raised px-5 py-3.5 text-[14px] text-graphite outline-none placeholder:text-graphite-mute focus-visible:outline-2 focus-visible:outline-graphite"
        />
      </label>

      {status === "error" && (
        <p role="alert" className="m-0 px-1 text-[12.5px] text-founder-deep">{errorMessage}</p>
      )}

      {turnstileSiteKey && <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" aria-label="Security check" />}

      <button type="submit" disabled={status === "submitting"} className={`${CTA} disabled:opacity-60`}>
        {status === "submitting" ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
