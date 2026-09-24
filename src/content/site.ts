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

export const ANNOUNCEMENT = "From us to your doorstep, wherever you are.";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
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
  { stat: "15+", label: "Handcrafted puzzles and games" },
  { stat: "10+", label: "Facts in our Curious Corner" },
  { stat: "5", label: "Around the World and Wonder features" },
  { stat: "Your pace", label: "Screen-free fun, five minutes or an afternoon" },
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
    body: "Solve it over coffee, challenge a partner, or spread it across the table with family and friends.",
  },
  {
    title: "Fresh edition every month",
    body: "New puzzles, new facts, new challenges. Never the same issue twice.",
  },
  {
    title: "Made for your world",
    body: "Trivia, references and puzzles shaped around what feels familiar and relevant to you.",
  },
  {
    title: "Delivered to your door",
    body: "No pickup, no app store. It lands at your doorstep.",
  },
] as const;

export const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Choose a plan from your account",
    body: "Select a 1, 3 or 12-month prepaid term, sign in with Google or Microsoft, and review the complete price before paying.",
  },
  {
    num: "02",
    title: "We create and print the edition",
    body: "Our team builds a fresh set of puzzles, games and facts each month and sends it to print.",
  },
  {
    num: "03",
    title: "Receive it every month",
    body: "Your copy is dispatched for each eligible monthly edition in your prepaid term.",
  },
  {
    num: "04",
    title: "Play, share and enjoy",
    body: "Solve it solo, race a friend, or spread it across the table. Try not to peek at the answers.",
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
    best: false,
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
    best: true,
    renewsEvery: "Manual renewal",
    blurb: "Subscribe for twelve months at a special monthly rate. INR 2,100 prepaid.",
  },
] as const;

/** India launch prices. The server remains authoritative at checkout. */
export const CURRENCY_OPTIONS = [
  { code: "INR", symbol: "₹", perUsd: 1 },
] as const;

export const WHO_FOR = [
  { key: "Adults", body: "A real break from the screen, with something worth looking forward to." },
  { key: "Families & friends", body: "One newspaper. One table. Plenty to argue about." },
  { key: "Travellers", body: "Toss it in your bag. No Wi-Fi, no charging, no roaming charges." },
  { key: "Offices", body: "A shared copy in the break room turns lunch into a puzzle race." },
  { key: "Gifts", body: "A subscription that keeps arriving all year, not just for one birthday." },
] as const;

/**
 * Beta-reader feedback ahead of public launch. Labeled accurately per the
 * build brief — replace with verified customer reviews once they exist.
 */
export const TESTIMONIALS: ReadonlyArray<{ initials: string; name: string; role: string; quote: string }> = [];

export const FAQ_PREVIEW = [
  {
    q: "What's inside each issue?",
    a: "Each issue brings 15+ handcrafted puzzles and games, 10+ curious facts, and five Around the World and Wonder features to explore at your own pace.",
  },
  {
    q: "Where do you deliver?",
    a: "We currently provide free delivery across India. For international subscription enquiries, contact us at hello@offscrolltimes.com or on WhatsApp.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Request cancellation from your Offscroll Times account. Manual renewal means no future payment is taken automatically; already-paid eligible issues remain scheduled.",
  },
  {
    q: "Is it suitable for kids?",
    a: "It's built for adults and teens, but many puzzles and facts work well for families and friends to do together. It isn't a children's activity book.",
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
    title: "About the publication",
    items: [
      { q: "What is Offscroll Times?", a: "A physical monthly newspaper filled with original puzzles, games, illustrations and regional trivia. It is printed and delivered by post; it is not a digital newsletter." },
      { q: "What is inside each issue?", a: "Each edition includes 15+ puzzles and games, 10+ curious facts, and five Around the World and Wonder features, with illustrations and challenges to enjoy alone or together." },
      { q: "Will I see the same puzzles again?", a: "No. Each monthly edition has a fresh theme and newly prepared content. Sample previews deliberately hide full puzzles and answers." },
    ],
  },
  {
    key: "subscription",
    title: "Subscription and renewals",
    items: [
      { q: "What is the monthly print cut-off?", a: "Orders and address changes received by the 20th are included in the next month's print run. For example, an order placed on 18 August is eligible for the September edition; an order placed on 22 August starts with October." },
      { q: "When does my subscription start and end?", a: "Your subscription starts with the first eligible edition shown before checkout. A 3-month term includes three monthly editions and ends after the third edition unless you manually buy a new term. The same rule applies to 1 and 12-month terms." },
      { q: "How many copies will I receive?", a: "The selected duration multiplied by copies per edition gives the total. For example, 3 months with 2 copies per edition provides 6 printed copies." },
      { q: "Can I buy it as a gift or for a workplace?", a: "Yes. Use the recipient, office or reception delivery address during checkout. Multiple copies can be sent to the same address." },
    ],
  },
  {
    key: "payment",
    title: "Payments and currencies",
    items: [
      { q: "What does the payment cover?", a: "One payment covers every monthly copy in the selected term, including delivery. Any applicable tax is shown and confirmed by the payment provider at checkout." },
      { q: "Which currencies and payment methods are supported?", a: "Online checkout currently supports INR for India delivery. Available payment methods appear in Razorpay Checkout. For Europe, contact us before ordering." },
      { q: "How do offers and duration discounts work?", a: "Longer terms receive the percentage shown beside the duration. A valid offer code is applied after the duration discount, and the exact monetary saving appears in the order summary." },
    ],
  },
  {
    key: "delivery",
    title: "India delivery",
    items: [
      { q: "How long does delivery take in India?", a: "We normally dispatch in the first week of the month. Delivery within India is estimated at 3–7 business days after dispatch, depending on the destination and postal service." },
      { q: "Where is delivery available?", a: "Online checkout currently supports India, with free delivery included in every plan." },
    ],
  },
  { key: "europe", title: "European delivery", items: [
    { q: "Can I subscribe from Europe?", a: "European checkout is not yet available. Email hello@offscrolltimes.com or use WhatsApp with your country so we can confirm availability, price and shipping before an order." },
  ] },
  {
    key: "cancellation",
    title: "Pause or cancellation",
    items: [
      { q: "Can I cancel within seven days?", a: "You may request cancellation within 7 days of purchase for a full refund if the first issue has not already been prepared or dispatched." },
      { q: "Can I pause my subscription?", a: "You can request a pause before the monthly cut-off on the 20th. A request after the cut-off applies from the following edition because the next copy may already be in production." },
      { q: "Does my subscription renew automatically?", a: "No. The current Razorpay checkout is prepaid for the selected term and renewal is manual. No future payment is taken without a new authorisation; editions already paid for remain scheduled." },
    ],
  },
  {
    key: "account",
    title: "Address changes and account",
    items: [
      { q: "How do I access my account?", a: "Sign in with Google or Microsoft, then open Account to view your subscription, payments, invoices, dispatches and support options." },
      { q: "When can I change my delivery address?", a: "Update the address in your account by the 20th for the next month's edition. For example, a change saved on 19 August applies to September; a change on 21 August applies from October." },
      { q: "What happens if I change my address after the deadline?", a: "The upcoming copy may already be allocated to the previous address. Contact support immediately; we will help where possible, but rerouting cannot be guaranteed after the print cut-off." },
      { q: "Can other customers see my details?", a: "No. Authenticated customers can access only their own subscription, payment, address and dispatch records." },
    ],
  },
  { key: "returns", title: "Returns, refunds and damaged copies", items: [
    { q: "What if my issue is damaged, missing or delayed?", a: "Contact support with your order details and, for damage, a photo. Report a missing issue within 14 days of the expected delivery date. We will investigate and, where eligible, arrange a replacement or refund for that issue." },
    { q: "When can I receive a refund?", a: "Request cancellation within seven days of purchase before preparation or dispatch for a full refund under the published policy. A damaged or missing eligible issue may be replaced or refunded. Copies delivered in good condition are generally not refundable." },
  ] },
  { key: "gift", title: "Gift subscriptions", items: [
    { q: "Can I send it as a gift?", a: "Yes. Enter the recipient's India delivery address at checkout. Ask support first if you need an international delivery or a gift message." },
  ] },
  { key: "bulk", title: "Bulk and corporate orders", items: [
    { q: "Can our office order multiple copies?", a: "Yes. Choose a quantity for one India delivery address, or contact us for a tailored bulk enquiry." },
  ] },
  { key: "privacy", title: "Privacy and email preferences", items: [
    { q: "Will a purchase subscribe me to marketing emails?", a: "No. Purchasing the newspaper does not add you to a marketing list. There is no newsletter signup at present." },
  ] },
] as const;

export const FOOTER_DELIVERY_REGIONS = ["India (free)", "International: enquire first"] as const;

export const FOOTER_PAYMENT_METHODS = [
  "Razorpay secure checkout",
  "Available methods shown before payment",
] as const;

/**
 * Content for /about. The imagery is temporary concept photography. Replace
 * it with real team, workspace and production photos before launch.
 */
export const ABOUT_INTRO = {
  eyebrow: "About us",
  title: "What if a newspaper was something you did?",
  body: "The Offscroll Times began with a simple question: what if a newspaper wasn't something you just read, but something you actually did? So we made one. Every monthly issue is filled with puzzles, games, curious facts, illustrations and challenges. Pick a page, grab a pencil and make a little time your own.",
};

export const WHO_WE_ARE = {
  paragraphs: [
    "We kept reaching for our phones without noticing. A few minutes of scrolling became half an hour, and we missed the small things: a pencil, a puzzle, a silly answer shared across the table.",
    "For some of us, it brought back childhood afternoons solving riddles and crosswords with our parents. We would guess, argue, laugh and keep going. They felt ordinary then, but became the moments we remember.",
    "Life is busier now, so we made something you can pick up for five minutes or lose yourself in for an hour. Start anywhere. Play alone or challenge someone beside you. There are no rules about how you offscroll.",
    "That's how The Offscroll Times came to life: our way of bringing back paper, pencils, puzzles and a few minutes that are completely yours. We made it because we missed those moments. We hope you enjoy them too.",
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
  { title: "Original puzzles, every time", body: "We create each edition's puzzles, games and ideas for the issue rather than dropping a generic puzzle collection onto the page." },
  { title: "Made for our Offscrollers", body: "Trivia and little details are chosen with our readers in mind, so each edition feels familiar, relevant and personal." },
  { title: "Designed to be played", body: "Type, illustrations and spacing are designed for pencils, scribbles and real hands." },
  { title: "Tested until it's right", body: "We write, solve, test and rethink puzzles until the clues and difficulty feel right." },
  { title: "Printed properly", body: "We choose paper and printing for how the issue feels and how a pencil moves across it." },
  { title: "Delivered to your door", body: "We handle printing, packing and posting so the newspaper arrives ready to open and play." },
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
    body: "Each issue is packed and posted to eligible subscribers on the monthly edition schedule.",
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
  title: "A new edition every month. Choose your term.",
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
    heading: "THE\nOFFSCROLL\nTIMES",
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
  estimate: "Issues are dispatched in the first week of the month. Delivery within India is estimated at 3–7 business days after dispatch, depending on the destination and postal service.",
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
