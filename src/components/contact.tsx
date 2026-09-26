import { useState } from "react";
import { ENQUIRY_TYPES } from '#/content/site';
import { CTA } from '#/lib/uiKit';

type EnquiryKey = (typeof ENQUIRY_TYPES)[number]["key"];

const DETAIL_FIELD: Record<EnquiryKey, { label: string; placeholder: string } | null> = {
  general: null,
  subscription: { label: "Order or membership email (if different)", placeholder: "you@example.com" },
  bulk: { label: "Estimated number of copies", placeholder: "e.g. 25" },
  partnership: { label: "Company / organisation name", placeholder: "e.g. Acme Retail" },
};

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
  const detailField = DETAIL_FIELD[enquiryType];

  return (
    <form action="https://formsubmit.co/hello@offscrolltimes.com" method="POST" className="flex flex-col gap-4">
      <input type="hidden" name="_subject" value="Offscroll Times contact enquiry" />
      <input type="hidden" name="_template" value="table" />
      <p className="text-sm text-graphite-soft">Send your enquiry to hello@offscrolltimes.com. After submitting, complete the security check on FormSubmit. Please do not include passwords or payment details. <a href="/policies/privacy" className="underline">Privacy policy</a></p>
      <label className="hidden" aria-hidden="true">
        Leave this field empty
        <input type="text" name="_honey" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-full border border-graphite bg-paper-raised px-5 py-3.5">
        <span className="font-mono text-[11px] tracking-[0.06em] text-graphite-mute uppercase">
          What can we help with?
        </span>
        <select
          name="enquiry_type"
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
            name="name"
            maxLength={100}
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
            name="email"
            maxLength={200}
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
          name="country"
          maxLength={80}
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
            name="details"
            maxLength={200}
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
          name="message"
          minLength={10}
          maxLength={4000}
          required
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="How can we help?"
          className="w-full rounded-2xl border border-graphite bg-paper-raised px-5 py-3.5 text-[14px] text-graphite outline-none placeholder:text-graphite-mute focus-visible:outline-2 focus-visible:outline-graphite"
        />
      </label>

      <button type="submit" className={CTA}>
        Send message
      </button>
    </form>
  );
}
