export const BRAND_NAME = "Offscroll Times";
// Set to the approved email service's hosted subscription form when supplied.
export const BLOG_SIGNUP_URL: string = "";
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
  location: "Coimbatore, Tamil Nadu, India",
  registration: "Legal entity name, registered address and registration numbers will be published after incorporation approval.",
};

export const ANNOUNCEMENT = "From us to your doorstep, wherever you are.";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/subscription", label: "Subscription" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
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
  { stat: "∞", label: "Unlimited Hours of screen-free fun" },
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
    a: "Each issue is a newspaper with no news—just 15+ handcrafted puzzles and games, 10+ curious facts, and five Around the World and Wonder features to explore at your own pace. No headlines, no breaking news, just pure play, curiosity, and discovery.",
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
    a: "It’s designed for adults and teens, but many of the puzzles and facts are also perfect for families and friends to enjoy together. It’s not a children’s activity book.",
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
    a: "Message us on WhatsApp with your order details within 7 days of the expected delivery date and we'll resend it or refund that issue.",
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
      { q: "What is Offscroll Times?", a: "The Offscroll Times is a monthly, screen-free newspaper that contains no news but is filled with puzzles, games, curious facts, illustrations, challenges and things worth arguing about." },
      { q: "What is inside each issue?", a: FAQ_PREVIEW[0].a },
      { q: "Will I see the same puzzles again?", a: "No. Each monthly edition has a fresh theme and newly prepared content. Sample previews deliberately hide full puzzles and answers." },
    ],
  },
  {
    key: "subscription",
    title: "Subscription and renewals",
    items: [
      { q: "What is the monthly print cut-off?", a: "Orders and address changes received by the 20th are included in the next month's print run. For example, an order placed on 18 August is eligible for the September edition; an order placed on 22 August starts with October." },
      { q: "When does my subscription start and end?", a: "You can choose a subscription plan, and your subscription will continue until you decide to cancel it. For example, if you choose a 3-month plan, it will automatically renew for another 3 months once the initial period ends. If you wish to stop your subscription, please cancel it by the 10th of the month to avoid being charged for the upcoming month’s delivery. If you cancel after the 10th, the payment will be processed, and the next month’s delivery will be sent to your postbox." },
      { q: "How many copies will I receive?", a: "Usually, 1 copy per edition is selected automatically when you place your order. If you need more copies, you can choose the number of copies you’d like while selecting your subscription plan. For bulk orders, please contact us at hello@offscrolltimes.com and we’ll be happy to help." },
      { q: "Can I buy it as a gift or for a workplace?", a: "Yes. Use the recipient, office or reception delivery address during checkout. Multiple copies can be sent to the same address." },
    ],
  },
  {
    key: "payment",
    title: "Payments and currencies",
    items: [
      { q: "What does the payment cover?", a: "One payment covers all copies, delivery, and applicable taxes for your selected subscription term." },
      { q: "Which currencies and payment methods are supported?", a: "Online checkout currently supports INR for India delivery. Available payment methods appear in Razorpay Checkout. For international orders, contact us before ordering." },
    ],
  },
  {
    key: "delivery",
    title: "India delivery",
    items: [
      { q: "How long does delivery take in India?", a: "We normally dispatch copies during the last week of each month, so you can expect to receive your copy during the first week of the following month. Delivery within India typically takes 3–7 business days after dispatch, depending on the destination and postal service." },
      { q: "Where is delivery available?", a: "Online checkout currently supports India, with free delivery included in every plan." },
    ],
  },
  { key: "international", title: "International Delivery", items: [
    { q: "Can I subscribe internationally?", a: "International checkout is not yet available. Email hello@offscrolltimes.com or use WhatsApp with your country so we can confirm availability, price and shipping before an order." },
  ] },
  {
    key: "cancellation",
    title: "Pause or cancellation",
    items: [
      { q: "Can I pause my subscription?", a: "You can request a pause before the monthly cut-off on the 10th. A request after the cut-off applies from the following edition because the next copy may already be in production." },
      { q: "Does my subscription renew automatically?", a: "Yes, the subscription will renew automatically at the end of each term and will continue until you decide to cancel it. You will not need to manually renew your subscription each time." },
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
    { q: "What if my issue is damaged, missing or delayed?", a: "Contact support with your order details and, for damage, a photo. Report a missing issue within 7 days of the expected delivery date. We will investigate and, where eligible, arrange a replacement or refund for that issue." },
    { q: "When can I receive a refund?", a: "Request cancellation within seven days of purchase before preparation or dispatch for a full refund under the published policy. A damaged or missing eligible issue may be replaced or refunded. Copies delivered in good condition are generally not refundable." },
  ] },
  { key: "gift", title: "Gift subscriptions", items: [
    { q: "Can I send it as a gift?", a: "Yes. Enter the recipient's India delivery address at checkout. Ask support first if you need an international delivery or a gift message." },
  ] },
  { key: "bulk", title: "Bulk and corporate orders", items: [
    { q: "Can our office order multiple copies?", a: "Yes. Choose a quantity for one India delivery address, or contact us for a tailored bulk enquiry." },
  ] },
] as const;

export const FOOTER_DELIVERY_REGIONS = ["India (free)", "International — get in touch"] as const;

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
  title: "What if a newspaper had no news?",
  paragraphs: [
    "The Offscroll Times started with a simple question:",
    "What if a newspaper wasn't something you just read? What if it was something you actually did?",
    "So we made one.",
    "The Offscroll Times is a monthly, screen-free newspaper filled with puzzles, games, curious facts, illustrations, challenges and things worth arguing about.",
    "It looks a little like a newspaper.",
    "But it refuses to behave like one.",
    "You don't have to start at page one. You don't have to read everything. You don't even have to be particularly good at puzzles.",
    "Grab a pencil. Pick a page. Get stuck. Come back later. Challenge someone sitting next to you.",
  ],
};

export const WHO_WE_ARE = {
  sections: [
    {
      title: "We Missed the Little Things.",
      paragraphs: [
        "Somewhere along the way, our phones started taking up more of our time than we realised.",
        "A few minutes of scrolling became half an hour. One thing led to another, and before we knew it, the day had moved on.",
        "And honestly, we started missing the simple things.",
        "Sitting down with a pencil. Getting lost in a puzzle. Laughing over a silly answer. Sharing a crossword across the table with someone else.",
        "For some of us, it brought back memories of childhood — sitting with our parents, solving riddles and crosswords together. We had nowhere else to be. We would think, guess, argue over answers, laugh, and keep going.",
        "They were ordinary moments.",
      ],
      closing: "But somehow, they became the ones we remember.",
    },
    {
      title: "So, We Made Something Different.",
      paragraphs: [
        "Life is busier now. There is always something to do, somewhere to be, or something waiting on our phones.",
        "So we wanted to create something that could fit into those little gaps.",
        "Something you could pick up for five minutes, or get completely lost in for an hour.",
        "Something you could enjoy on your own, or pass across the table to someone else.",
        "And that's how The Offscroll Times came to life.",
      ],
    },
    {
      title: "A Newspaper for Slower Moments.",
      paragraphs: [
        "The Offscroll Times is our little way of bringing back the joy of paper, pencils, puzzles, and simply being together.",
        "No notifications.\nNo endless scrolling.\nNo pressure to keep up.",
      ],
      closing: "Just a newspaper, a little curiosity, and a few minutes that are completely yours.",
      afterword: "We made it because we missed those moments.",
      signoff: "We hope you enjoy them too.",
    },
  ],
  location: "Coimbatore, Tamil Nadu, India — printing and shipping across India.",
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
  { title: "Original puzzles, every time", body: "We create each edition's puzzles, games and ideas for the edition rather than dropping a generic puzzle collection onto the page." },
  { title: "Made for our Offscrollers", body: "Trivia and little details are chosen with our readers in mind, so each edition feels familiar, relevant and personal." },
  { title: "Designed to be played", body: "Type, illustrations and spacing are designed for pencils, scribbles and real hands." },
  { title: "Tested until it's right", body: "We write, solve, test and rethink puzzles until the clues and difficulty feel right." },
  { title: "Printed properly", body: "We choose paper and printing for how the edition feels and how a pencil moves across it." },
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
