# UI, Accessibility and Compatibility Test Report

Last automated run: 27 August 2026

## Automated checks passed

- Global visible `:focus-visible` styling and keyboard skip-link behavior.
- Reduced-motion override for the envelope and animated UI.
- Named navigation landmarks, dialogs, alerts and live status messages.
- Modal focus entry, Tab containment and Escape dismissal for the envelope.
- Semantic table headings in operational reports.
- Loading, empty, failure, timeout and retry states are present.
- WhatsApp uses an HTTPS `wa.me` deep link, a pre-filled message, accessible name and safe new-tab attributes.
- Floating WhatsApp link no longer creates a malformed URL with two query markers.

## Manual browser matrix still required

These checks cannot be certified from unit tests. Execute them before launch and record browser/version, OS/device, date, tester and result.

| Area | Required coverage | Status |
|---|---|---|
| Desktop | Current Chrome, Edge, Firefox and Safari | Not run |
| Mobile | Current iOS Safari and Android Chrome | Not run |
| Keyboard | Header, envelope, FAQ, subscription, checkout, profile and admin | Not run |
| Screen reader | VoiceOver/Safari and NVDA/Firefox or Chrome | Not run |
| Reflow | 200% text and 400% browser zoom at 1280px | Not run |
| Contrast | Normal text, large text, controls and focus indicators | Not run |
| Motion | Operating-system reduced-motion setting | Automated contract only |
| Network | Slow 3G, offline, timeout and failed API responses | State contracts only |
| WhatsApp | Installed mobile app and desktop/web fallback | URL contract only |

## Acceptance criteria

- No horizontal scrolling at 320 CSS pixels except intentionally scrollable data tables.
- Every action is reachable and operable without a pointer.
- Focus remains visible and follows a logical reading order.
- Every control has an announced name, role, state and error association.
- Heading levels and landmarks describe the page without relying on visual placement.
- At 200% text and 400% zoom, content and controls remain available without overlap.
- Reduced motion removes decorative movement without hiding content.
- Loading and errors are announced, preserve entered data where safe, and offer recovery.
- WhatsApp opens the intended conversation with exactly one encoded pre-filled message.
