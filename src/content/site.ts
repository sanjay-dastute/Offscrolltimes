export const BRAND_NAME = "Offscroll Times";
export const BRAND_TAGLINE = "A monthly puzzle newspaper. No screens required.";

// Placeholder contact channel — update to the real business WhatsApp number
// before publishing. Format: https://wa.me/<countrycode><number> with no
// punctuation.
export const WHATSAPP_NUMBER = "+91 73730 50093";
export const WHATSAPP_URL = `https://wa.me/917373050093?text=${encodeURIComponent(
  "Hi, I'm interested in an Offscroll Times subscription. Please share the available plans and delivery details for my country.",
)}`;

// Add profiles only after the client confirms ownership. An empty list keeps
// unapproved or placeholder social accounts out of the public footer.
export const APPROVED_SOCIAL_LINKS: ReadonlyArray<{ label: string; href: string }> = [];

export const BUSINESS_DETAILS = {
  location: "Bengaluru, Karnataka, India",
  registration: "Legal entity name, registered address and registration numbers will be published after incorporation approval.",
};

export const ANNOUNCEMENT = "Free delivery across India.";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/subscription", label: "Subscription" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/policies/terms", label: "Legal" },
] as const;

// Placeholder support inbox — update to the real address before publishing.
export const CONTACT_EMAIL = "hello@offscrolltimes.com";

export const CONTACT_HOURS = {
  india: "Monday–Saturday, 10:00–18:00 IST",
  responseTime: "We reply within 1 business day, usually much sooner.",
};

/** Framed honestly: one team, based in India, serving both regions —
 * not two separate local offices. */
export const CONTACT_REGIONS = [
  {
    key: "india",
    label: "India",
    note: "Our team is based here. WhatsApp and email both reach us directly during India hours.",
  },
  {
    key: "europe",
    label: "Europe",
    note: "We're India-based, so evenings in Europe overlap with our working day. Email anytime — we reply within 1 business day.",
  },
] as const;

export const ENQUIRY_TYPES = [
  {
    key: "general",
    label: "General enquiry",
    description: "Anything that doesn't fit the categories below.",
  },
  {
    key: "subscription",
    label: "Subscription & order support",
    description: "Billing, delivery, a missing or damaged issue, cancelling or pausing.",
  },
  {
    key: "bulk",
    label: "Bulk & corporate orders",
    description: "Multiple copies for an office, school or event.",
  },
  {
    key: "partnership",
    label: "Partnership & retailer enquiry",
    description: "Stocking Offscroll Times, co-branding, or working with us.",
  },
] as const;

export function whatsappEnquiryMessage(country: string): string {
  const place = country.trim() || "my country";
  return `Hi, I'm interested in your monthly puzzle newspaper. Please share the subscription and delivery details for ${place}.`;
}

export const SUBSCRIBE_HREF = "/subscription";

export const WHATS_INSIDE = [
  { stat: "20+", label: "Handcrafted puzzles & games" },
  { stat: "10", label: "Fun facts & local trivia" },
  { stat: "5", label: "Illustrations to color & keep" },
  { stat: "45–60 min", label: "Screen-free entertainment per issue" },
] as const;

export const PREVIEW_CLIPS = [
  { key: "crossword", label: "Crossword", teaser: "7 ACROSS: The thing your phone keeps stealing (5 letters)", rotate: "-rotate-3" },
  { key: "sudoku", label: "Sudoku", teaser: "One square left. You've got this.", rotate: "rotate-2" },
  { key: "word-search", label: "Word search", teaser: "12 words hidden in the grid. Good luck.", rotate: "-rotate-1" },
  { key: "trivia", label: "Trivia", teaser: "Did you know...? Answer inside this issue.", rotate: "rotate-3" },
  { key: "spot-the-difference", label: "Spot the difference", teaser: "5 differences. We're only showing you 2.", rotate: "-rotate-2" },
  { key: "maze", label: "Maze", teaser: "One path in. Many ways to get lost.", rotate: "rotate-1" },
] as const;

export const WHY_LOVE = [
  {
    title: "Screen-free entertainment",
    body: "No app, no login, no battery. Just paper, a pen and your brain.",
  },
  {
    title: "Suitable for individuals, couples and families",
    body: "Solo over coffee, or spread across the table with the people you live with.",
  },
  {
    title: "Fresh edition every month",
    body: "New puzzles, new facts, new themes. Never the same issue twice.",
  },
  {
    title: "Locally relevant content",
    body: "Trivia, references and puzzles tuned to where you live, not a generic template.",
  },
  {
    title: "Delivered to your door",
    body: "No pickup, no app store. It shows up in your mailbox.",
  },
] as const;

export const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Choose a plan",
    body: "Choose a 1, 3, 6 or 12-month prepaid term and confirm the complete price before checkout.",
  },
  {
    num: "02",
    title: "We create and print the edition",
    body: "Our team builds a fresh set of puzzles, games and facts each month and sends it to print.",
  },
  {
    num: "03",
    title: "Receive it every month",
    body: "Your copy arrives by post, timed to your billing cycle.",
  },
  {
    num: "04",
    title: "Play, share and enjoy",
    body: "Solve it solo, race a friend, or pass pages around the table.",
  },
] as const;

/** Display plans; the server remains authoritative for final pricing. */
export const PLANS = [
  {
    key: "launch",
    name: "Launch Offer",
    planId: "12",
    promotion: "LAUNCH159",
    priceUsd: 159,
    price: "INR 159",
    period: "/ month for 1 year",
    monthlyEquivalent: "INR 1,908 prepaid for 12 months",
    best: true,
    renewsEvery: "Manual renewal",
    blurb: "Available exclusively during the first month of launch. Limited-period introductory offer.",
  },
  {
    key: "monthly",
    name: "Monthly Subscription",
    planId: "1",
    promotion: null,
    priceUsd: 199,
    price: "INR 199",
    period: "/ month",
    monthlyEquivalent: null,
    best: false,
    renewsEvery: "Manual renewal",
    blurb: "A flexible one-month subscription with manual renewal.",
  },
  {
    key: "quarterly",
    name: "3-Month Subscription",
    planId: "3",
    promotion: null,
    priceUsd: 185,
    price: "INR 185",
    period: "/ month",
    monthlyEquivalent: "INR 555 prepaid for 3 months",
    best: false,
    renewsEvery: "Manual renewal",
    blurb: "Subscribe for three months at a special monthly rate. INR 555 prepaid.",
  },
  {
    key: "annual",
    name: "12-Month Subscription",
    planId: "12",
    promotion: null,
    priceUsd: 175,
    price: "INR 175",
    period: "/ month",
    monthlyEquivalent: "INR 2,100 prepaid for 12 months",
    best: false,
    renewsEvery: "Manual renewal",
    blurb: "Subscribe for twelve months at a special monthly rate. INR 2,100 prepaid.",
  },
] as const;

/** India launch prices. The server remains authoritative at checkout. */
export const CURRENCY_OPTIONS = [
  { code: "INR", symbol: "₹", perUsd: 1 },
] as const;

export const WHO_FOR = [
  { key: "Individuals", body: "A proper break from your phone that still feels like a treat." },
  { key: "Couples", body: "Solve side by side, swap clues, or turn it into a friendly competition." },
  { key: "Families", body: "Something the whole table can do together, no screens fought over." },
  { key: "Offices", body: "A shared copy in the break room turns lunch into a puzzle race." },
  { key: "Gifts", body: "A subscription that keeps arriving all year, not just for one birthday." },
] as const;

/**
 * Beta-reader feedback ahead of public launch. Labeled accurately per the
 * build brief — replace with verified customer reviews once they exist.
 */
export const TESTIMONIALS = [
  {
    initials: "AR",
    name: "Ananya R.",
    role: "Beta reader · Bengaluru",
    quote:
      "Did the crossword with my mom over chai. First time in months we weren't both staring at our phones.",
  },
  {
    initials: "MT",
    name: "Marco T.",
    role: "Beta reader · Lisbon",
    quote: "Genuinely surprised how good the trivia was. Wasn't expecting to learn something.",
  },
  {
    initials: "PD",
    name: "Priya & Dev",
    role: "Beta readers · Mumbai",
    quote: "We raced each other through the word search. I lost. Doing it again next month.",
  },
] as const;

export const FAQ_PREVIEW = [
  {
    q: "What's inside each issue?",
    a: "20+ handcrafted puzzles and games, 10 fun facts and local trivia, and 5 illustrations to color, all in one printed edition.",
  },
  {
    q: "Where do you deliver?",
    a: "We currently provide free delivery across India. For international subscription enquiries, message us on Instagram or email hello@offscrolltimes.com.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Request cancellation from your Offscroll Times account. Manual renewal means no future payment is taken automatically; already-paid eligible issues remain scheduled.",
  },
  {
    q: "Is it suitable for kids?",
    a: "It's built for adults and teens, but most puzzles and facts work well for families to do together. It isn't a children's activity book.",
  },
  {
    q: "How am I billed?",
    a: "Your selected prepaid term is charged through Razorpay. The available payment methods and final currency are shown in the secure payment window.",
  },
] as const;

export const FAQ_MORE = [
  {
    q: "How long does delivery take?",
    a: "We aim to dispatch every edition within the first week of the month. Transit time then depends on postal services in your country, typically 3-10 business days.",
  },
  {
    q: "What if my issue arrives damaged or missing?",
    a: "Message us on WhatsApp with your order details within 14 days of the expected delivery date and we'll resend it or refund that issue.",
  },
  {
    q: "Can I gift a subscription?",
    a: "Yes. Choose any plan at checkout and enter the recipient's delivery address instead of your own.",
  },
  {
    q: "Can I switch plans later?",
    a: "Renew from your Offscroll Times account and choose a different duration for the new prepaid term.",
  },
  {
    q: "Do you ship to office addresses?",
    a: "Yes. Many subscribers have a shared copy delivered to a break room or reception desk.",
  },
] as const;

export const FAQ_GROUPS = [
  {
    key: "publication",
    title: "Publication",
    items: [
      { q: "What is Offscroll Times?", a: "A physical monthly newspaper filled with original puzzles, games, illustrations and regional trivia. It is printed and delivered by post; it is not a digital newsletter." },
      { q: "What is inside each issue?", a: "Every edition contains more than 20 puzzles and games, fun facts, local trivia and illustrations, designed for adults, teens and families to enjoy together." },
      { q: "Will I see the same puzzles again?", a: "No. Each monthly edition has a fresh theme and newly prepared content. Sample previews deliberately hide full puzzles and answers." },
    ],
  },
  {
    key: "subscription",
    title: "Subscription",
    items: [
      { q: "What is the monthly print cut-off?", a: "Orders and address changes received by the 20th are included in the next month's print run. For example, an order placed on 18 August is eligible for the September edition; an order placed on 22 August starts with October." },
      { q: "When does my subscription start and end?", a: "Your subscription starts with the first eligible edition shown before checkout. A 3-month term includes three consecutive monthly editions and ends after the third edition unless it renews; the same rule applies to 1, 6 and 12-month terms." },
      { q: "How many copies will I receive?", a: "The selected duration multiplied by copies per edition gives the total. For example, 6 months with 2 copies per edition provides 12 printed copies." },
      { q: "Can I buy it as a gift or for a workplace?", a: "Yes. Use the recipient, office or reception delivery address during checkout. Multiple copies can be sent to the same address." },
    ],
  },
  {
    key: "payment",
    title: "Payment",
    items: [
      { q: "What does the payment cover?", a: "One payment covers every monthly copy in the selected term, including delivery. Any applicable tax is shown and confirmed by the payment provider at checkout." },
      { q: "Which currencies and payment methods are supported?", a: "The website displays estimated USD, INR, EUR and GBP totals. The final currency, tax and available payment methods are confirmed at checkout. Razorpay will be connected before public launch." },
      { q: "How do offers and duration discounts work?", a: "Longer terms receive the percentage shown beside the duration. A valid offer code is applied after the duration discount, and the exact monetary saving appears in the order summary." },
    ],
  },
  {
    key: "delivery",
    title: "Delivery",
    items: [
      { q: "How long does delivery take in India?", a: "We normally dispatch in the first week of the month. Delivery within India is estimated at 3–7 business days after dispatch, depending on the destination and postal service." },
      { q: "Do you deliver internationally?", a: "International checkout is not currently available. Message us on Instagram or email hello@offscrolltimes.com with your country for a subscription enquiry." },
      { q: "Where is delivery available?", a: "Online checkout currently supports India, with free delivery included in every plan." },
      { q: "What if my issue is damaged, missing or delayed?", a: "Contact support with your order details and, for damage, a photo. Report a missing issue within 14 days of its expected delivery date. We will investigate and, where eligible, arrange a replacement or refund for that issue." },
    ],
  },
  {
    key: "cancellation",
    title: "Pause, cancellation & renewal",
    items: [
      { q: "Can I cancel within seven days?", a: "You may request cancellation within 7 days of purchase for a full refund if the first issue has not already been prepared or dispatched." },
      { q: "Can I pause my subscription?", a: "You can request a pause before the monthly cut-off on the 20th. A request after the cut-off applies from the following edition because the next copy may already be in production." },
      { q: "Does my subscription renew automatically?", a: "No. The current Razorpay checkout is prepaid for the selected term and renewal is manual. No future payment is taken without a new authorisation; editions already paid for remain scheduled." },
      { q: "When can I receive a refund?", a: "The seven-day purchase cancellation applies before preparation or dispatch. A damaged or missing eligible issue may be replaced or refunded. Copies already delivered in good condition are not refundable." },
    ],
  },
  {
    key: "account",
    title: "Account & address",
    items: [
      { q: "How do I access my account?", a: "Sign in with Google or Microsoft, then open Account to view your subscription, payments, invoices, dispatches and support options." },
      { q: "When can I change my delivery address?", a: "Update the address in your account by the 20th for the next month's edition. For example, a change saved on 19 August applies to September; a change on 21 August applies from October." },
      { q: "What happens if I change my address after the deadline?", a: "The upcoming copy may already be allocated to the previous address. Contact support immediately; we will help where possible, but rerouting cannot be guaranteed after the print cut-off." },
      { q: "Can other customers see my details?", a: "No. Authenticated customers can access only their own subscription, payment, address and dispatch records." },
    ],
  },
] as const;

export const FOOTER_DELIVERY_REGIONS = [
  "India",
  "United Kingdom",
  "Ireland",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
] as const;

export const FOOTER_PAYMENT_METHODS = [
  "Razorpay checkout planned",
  "Methods confirmed at launch",
] as const;

/**
 * Content for /about. The imagery is temporary concept photography. Replace
 * it with real team, workspace and production photos before launch.
 */
export const ABOUT_INTRO = {
  eyebrow: "About us",
  title: "Made for better time away from screens.",
  body: "Offscroll Times is an independent print publication being built in India for curious readers across the country. Our goal is simple: make a monthly newspaper people genuinely look forward to opening, solving and sharing.",
};

export const WHO_WE_ARE = {
  paragraphs: [
    "We're a small team based in Bengaluru, building one thing: a print newspaper that makes putting your phone down feel like a reward instead of a chore.",
    "Our work brings together puzzle development, illustration, print production and subscriber care. Every grid is tested by a fresh pair of eyes before it goes anywhere near a printer.",
    "Our mission is simple: twenty-plus minutes of genuine, screen-free attention, delivered to your door, every single month.",
  ],
  location: "Bengaluru, India — printing and shipping across India.",
  image: { src: "/images/about-desk-sketches.jpg", alt: "A desk covered in early puzzle-grid sketches, a pencil and a coffee mug" },
  note: "Concept image — replace with a real studio photo.",
};

export const TEAM_ROLES = [
  {
    title: "Editorial & puzzle design",
    body: "Develops themes, writes clues, balances difficulty and shapes every issue from rough grid to finished page.",
  },
  {
    title: "Testing & illustration",
    body: "Solves drafts cold, flags unclear clues and turns approved ideas into playful, print-ready pages.",
  },
  {
    title: "Print & subscriber care",
    body: "Coordinates production and dispatch, then helps subscribers with delivery, address and account questions.",
  },
] as const;

export const WHY_US = [
  { title: "Original content", body: "Every puzzle is written from scratch for this issue. Nothing is licensed from a generic puzzle bank." },
  { title: "Regional relevance", body: "Trivia, references and themes tuned to where our readers actually live." },
  { title: "Careful design", body: "Layout, type and spacing get as much attention as the puzzles themselves." },
  { title: "Real testing", body: "Every grid is solved by a stranger before it's solved by you. If it stumps a tester for the wrong reasons, it gets rebuilt." },
  { title: "Print quality", body: "Real paper stock and print settings chosen for pen and pencil, not a printer-friendly PDF." },
  { title: "Screen-free by design", body: "No app, no login, no notifications. Just a physical thing that respects your attention." },
] as const;

export const PRODUCTION_PROCESS = [
  {
    num: "01",
    title: "Idea generation",
    body: "Every issue starts as a messy list: themes, local trivia angles, and puzzle formats we haven't tried yet.",
  },
  {
    num: "02",
    title: "Puzzle development",
    body: "Ideas become real grids and clues, built and rebuilt until the difficulty curve feels right.",
  },
  {
    num: "03",
    title: "Testing",
    body: "Draft pages go to a small group of testers who solve them cold, with pencils, at a kitchen table.",
  },
  {
    num: "04",
    title: "Illustration",
    body: "Once a puzzle earns its place, it gets its final artwork and layout pass.",
  },
  {
    num: "05",
    title: "Printing",
    body: "Finished pages go to print on paper stock chosen for how it holds up to pen, pencil and coffee rings.",
  },
  {
    num: "06",
    title: "Delivery",
    body: "Each issue is packed and posted on a schedule timed to subscribers' billing cycles.",
  },
] as const;

export const BEHIND_THE_SCENES = [
  {
    image: { src: "/images/about-early-sketch.jpg", alt: "A rough hand-drawn crossword grid draft on graph paper with margin notes" },
    caption: "prototype reference — concept image",
  },
  {
    image: { src: "/images/about-playtesting.jpg", alt: "Hands filling in a puzzle page with a pencil during a testing session" },
    caption: "play-testing reference — concept image",
  },
  {
    image: { src: "/images/about-print-shop.jpg", alt: "Freshly printed newspaper issues stacked at the print shop" },
    caption: "print reference — concept image",
  },
] as const;

/** Content for the paid product subscription page. */
export const SUBSCRIPTION_INTRO = {
  eyebrow: "Subscription",
  title: "One plan. A real newspaper, every time it renews.",
  body: "Choose a prepaid term and see its full price, delivery schedule, renewal and cancellation details before checkout.",
};

export const EDITION_PUZZLE_TYPES = [
  "Crossword",
  "Sudoku",
  "Word search",
  "Trivia",
  "Maze",
  "Spot the difference",
] as const;

export const SAMPLE_PAGES = [
  {
    key: "cover",
    label: "Cover",
    heading: "THE\nPUZZLE\nPOST",
    tiles: ["Issue No.", "This month's theme"],
  },
  {
    key: "grids",
    label: "Page 2–3",
    heading: "GRIDS",
    tiles: ["Crossword", "Sudoku", "Maze", "Word search"],
  },
  {
    key: "trivia",
    label: "Page 4",
    heading: "TRIVIA",
    tiles: ["Did you know?", "Local facts", "Quick quiz", "Bonus riddle"],
  },
  {
    key: "art",
    label: "Page 5",
    heading: "COLOR ME",
    tiles: ["Illustration", "Spot the difference"],
  },
] as const;

export const SHIPPING_INFO = {
  cost: "Delivery is free across India — no extra shipping fee at checkout.",
  estimate: "Issues are dispatched in the first week of the month and typically arrive within 3–10 business days, depending on your country's postal service.",
};

export const CANCELLATION_INFO = {
  cancel: "Request cancellation from your Offscroll Times account. Manual renewal means no future term is charged without your approval.",
  pause: "Where the published policy permits it, request a pause from your account before the monthly cut-off.",
};

export const GIFT_INFO = {
  body: "Buying for someone else? Enter their delivery address instead of your own during checkout, and the subscription ships straight to them.",
  note: "Want a handwritten note included in the first issue? Message us the details on WhatsApp after checkout.",
};

export const SUBSCRIPTION_FAQ = [
  {
    q: "When am I charged again?",
    a: "Renewal is manual. Near the end of the prepaid term, choose a new duration and authorise a new payment yourself.",
  },
  {
    q: "How do I cancel or pause?",
    a: "Use your Offscroll Times account. The confirmation explains how the request affects paid copies and future editions.",
  },
  {
    q: "Is shipping really included?",
    a: "Yes. The price shown is the total for that billing period, taxes aside — there's no separate shipping line at checkout.",
  },
  {
    q: "Can I order more than one copy?",
    a: "Yes. Use the quantity selector on each plan before checkout if you want multiple copies delivered to the same address, for a family or an office.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Select a new prepaid duration when renewing; the current server price is shown before payment.",
  },
  {
    q: "What currency will I actually be charged in?",
    a: "The pricing calculator displays the supported currency for your destination. The exact server-calculated total is confirmed before Razorpay payment authorisation.",
  },
] as const;

export const FOOTER_POLICY_LINKS = [
  { href: "/policies/terms", label: "Terms & conditions" },
  { href: "/policies/subscription", label: "Subscription terms" },
  { href: "/policies/delivery", label: "Shipping & delivery" },
  { href: "/policies/refund", label: "Cancellation & refunds" },
  { href: "/policies/privacy", label: "Privacy policy" },
  { href: "/policies/cookies", label: "Cookie preferences" },
  { href: "/policies/accessibility", label: "Accessibility" },
  { href: "/policies/contact", label: "Contact information" },
] as const;
