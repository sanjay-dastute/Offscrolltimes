export type PricingQuote = {
  currency: string
  monthlyPriceMinor: number
  durationMonths: number
  quantity: number
  subtotalMinor: number
  durationDiscountMinor: number
  offerDiscountMinor: number
  referralDiscountMinor: number
  shippingMinor: number
  taxBasisPoints: number
  taxMinor: number
  totalMinor: number
  discountId: string | null
  promotion: { id: string; code: string; kind: string; value: number; combinable: boolean } | null
  referralCode: string | null
  countryCode: string
}

type OptionRow = { id: string; duration_months: number; discount_basis_points: number; currency: string; base_monthly_minor: number; plan_monthly_minor: number }
type ZoneRow = { country_code: string; currency: string; shipping_minor: number; additional_copy_minor: number; tax_rate_basis_points: number; regional_monthly_price_minor: number|null }
type RegionalTermRow = { term_total_minor: number }
type DiscountRow = { id: string; code: string; kind: 'percentage'|'fixed'|'free_shipping'; value: number; usage_limit: number|null; redemptions: number; customer_redemptions: number; eligible_durations_json: string|null; eligible_countries_json: string|null; per_customer_limit: number|null; minimum_duration_months: number|null; minimum_order_minor: number|null; combinable_with_duration_discount: number }

function includesJsonNumber(value: string | null, expected: number) { if (!value) return true; try { return (JSON.parse(value) as unknown[]).map(Number).includes(expected) } catch { return false } }
function includesJsonString(value: string | null, expected: string) { if (!value) return true; try { return (JSON.parse(value) as unknown[]).map(String).includes(expected) } catch { return false } }

export async function calculatePricing(db: D1Database, input: { durationMonths: number; quantity: number; countryCode: string; discountCode?: string; referralCode?: string; userId?: string; includeInactiveDiscount?: boolean; now: number }): Promise<PricingQuote | null> {
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) return null
  const option = await db.prepare(`SELECT o.id, o.duration_months, o.discount_basis_points, o.currency, p.base_monthly_minor,
      COALESCE(o.monthly_price_minor,p.base_monthly_minor) plan_monthly_minor
    FROM admin_subscription_options o JOIN admin_products p ON p.id=o.product_id
    WHERE o.duration_months=? AND o.active=1 AND p.active=1 LIMIT 1`).bind(input.durationMonths).first<OptionRow>()
  const zone = await db.prepare(`SELECT country_code, currency, shipping_minor, additional_copy_minor, tax_rate_basis_points, regional_monthly_price_minor
    FROM admin_shipping_zones WHERE country_code=? AND active=1`).bind(input.countryCode).first<ZoneRow>()
  if (!option || !zone) return null
  const regionalTerm=await db.prepare(`SELECT term_total_minor FROM regional_subscription_prices WHERE country_code=? AND duration_months=?`).bind(input.countryCode,option.duration_months).first<RegionalTermRow>()

  // The standard monthly rate is the comparison price. The configured plan
  // rate is authoritative for the actual charge and creates the term saving.
  const regionalRate = zone.regional_monthly_price_minor
  const standardMonthlyPrice = regionalRate ?? option.base_monthly_minor
  const monthlyPriceMinor = regionalRate ?? option.plan_monthly_minor
  const shippingMinorBase = zone.shipping_minor + zone.additional_copy_minor * Math.max(0, input.quantity - 1)
  const subtotalMinor = regionalTerm
    ? Math.max(0, regionalTerm.term_total_minor - zone.shipping_minor) + monthlyPriceMinor * option.duration_months * Math.max(0,input.quantity-1)
    : standardMonthlyPrice * option.duration_months * input.quantity
  if (!Number.isSafeInteger(subtotalMinor)) return null
  const configuredPlanMinor = regionalTerm ? subtotalMinor : monthlyPriceMinor * option.duration_months * input.quantity
  let durationDiscountMinor = Math.max(0, subtotalMinor - configuredPlanMinor)
  if (durationDiscountMinor === 0 && option.discount_basis_points > 0) durationDiscountMinor = Math.round(subtotalMinor * option.discount_basis_points / 10000)
  let shippingMinor = shippingMinorBase
  let offerDiscountMinor = 0
  let referralDiscountMinor = 0
  let discountId: string | null = null
  let promotion: PricingQuote['promotion'] = null
  let referralCode: string | null = null
  const referral = input.referralCode?.trim().toUpperCase()
  if (referral && input.userId) {
    const [referrer, priorPurchase, priorReferral, settings] = await Promise.all([
      db.prepare(`SELECT owner_id FROM customer_referral_codes WHERE code=?`).bind(referral).first<{owner_id:string}>(),
      db.prepare(`SELECT id FROM customer_subscriptions s WHERE s.owner_id=? AND EXISTS(SELECT 1 FROM customer_payments p WHERE p.subscription_id=s.id AND p.status='paid') LIMIT 1`).bind(input.userId).first(),
      db.prepare(`SELECT id FROM referral_redemptions WHERE referred_owner_id=? LIMIT 1`).bind(input.userId).first(),
      db.prepare(`SELECT discount_basis_points FROM referral_settings WHERE id=1`).first<{discount_basis_points:number}>(),
    ])
    if (referrer && referrer.owner_id !== input.userId && !priorPurchase && !priorReferral && Number(settings?.discount_basis_points ?? 0) > 0) {
      referralDiscountMinor = Math.round(subtotalMinor * Number(settings!.discount_basis_points) / 10000)
      referralCode = referral
    }
  }
  const code = input.discountCode?.trim().toUpperCase()
  if (code) {
    const discount = await db.prepare(`SELECT d.id,d.code,d.kind,d.value,d.usage_limit,d.eligible_durations_json,d.eligible_countries_json,
      d.per_customer_limit,d.minimum_duration_months,d.minimum_order_minor,d.combinable_with_duration_discount,
      (SELECT COUNT(*) FROM discount_redemptions r WHERE r.discount_id=d.id) redemptions,
      (SELECT COUNT(*) FROM discount_redemptions r WHERE r.discount_id=d.id AND r.owner_id=?) customer_redemptions
      FROM admin_discounts d WHERE d.code=? AND (?=1 OR d.active=1) AND (d.starts_at IS NULL OR d.starts_at<=?)
      AND (d.ends_at IS NULL OR d.ends_at>=?)`).bind(input.userId ?? '',code,input.includeInactiveDiscount?1:0,input.now,input.now).first<DiscountRow>()
    const eligible = discount &&
      (discount.usage_limit === null || discount.redemptions < discount.usage_limit) &&
      (discount.per_customer_limit === null || discount.customer_redemptions < discount.per_customer_limit) &&
      (discount.minimum_duration_months === null || input.durationMonths >= discount.minimum_duration_months) &&
      (discount.minimum_order_minor === null || subtotalMinor >= discount.minimum_order_minor) &&
      includesJsonNumber(discount.eligible_durations_json, input.durationMonths) &&
      includesJsonString(discount.eligible_countries_json, input.countryCode)
    if (discount && eligible) {
      discountId = discount.id
      const combinable = discount.combinable_with_duration_discount === 1
      if (!combinable) durationDiscountMinor = 0
      if (discount.kind === 'percentage') offerDiscountMinor = Math.round((subtotalMinor-durationDiscountMinor) * Math.min(discount.value,10000) / 10000)
      if (discount.kind === 'fixed') offerDiscountMinor = Math.min(discount.value, subtotalMinor-durationDiscountMinor)
      if (discount.kind === 'free_shipping') shippingMinor = 0
      promotion = { id: discount.id, code: discount.code, kind: discount.kind, value: discount.value, combinable }
    }
  }
  if (referralCode) { offerDiscountMinor = 0; promotion = null }
  const taxableMinor = Math.max(0, subtotalMinor-durationDiscountMinor-offerDiscountMinor-referralDiscountMinor+shippingMinor)
  const taxMinor = Math.round(taxableMinor * zone.tax_rate_basis_points / 10000)
  return { currency: zone.currency, monthlyPriceMinor, durationMonths: option.duration_months, quantity: input.quantity, subtotalMinor, durationDiscountMinor, offerDiscountMinor, referralDiscountMinor, shippingMinor, taxBasisPoints: zone.tax_rate_basis_points, taxMinor, totalMinor: taxableMinor+taxMinor, discountId, promotion, referralCode, countryCode: zone.country_code }
}
