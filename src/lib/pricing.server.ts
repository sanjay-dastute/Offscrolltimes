export type PricingQuote = {
  currency: string
  monthlyPriceMinor: number
  durationMonths: number
  quantity: number
  subtotalMinor: number
  durationDiscountMinor: number
  offerDiscountMinor: number
  shippingMinor: number
  taxBasisPoints: number
  taxMinor: number
  totalMinor: number
  discountId: string | null
  promotion: { id: string; code: string; kind: string; value: number; combinable: boolean } | null
  countryCode: string
}

type OptionRow = { id: string; duration_months: number; discount_basis_points: number; currency: string; base_monthly_minor: number }
type ZoneRow = { country_code: string; currency: string; shipping_minor: number; additional_copy_minor: number; tax_rate_basis_points: number }
type DiscountRow = { id: string; code: string; kind: 'percentage'|'fixed'|'free_shipping'; value: number; usage_limit: number|null; redemptions: number; customer_redemptions: number; eligible_durations_json: string|null; eligible_countries_json: string|null; per_customer_limit: number|null; minimum_duration_months: number|null; minimum_order_minor: number|null; combinable_with_duration_discount: number }

function includesJsonNumber(value: string | null, expected: number) { if (!value) return true; try { return (JSON.parse(value) as unknown[]).map(Number).includes(expected) } catch { return false } }
function includesJsonString(value: string | null, expected: string) { if (!value) return true; try { return (JSON.parse(value) as unknown[]).map(String).includes(expected) } catch { return false } }

export async function calculatePricing(db: D1Database, input: { durationMonths: number; quantity: number; countryCode: string; discountCode?: string; userId?: string; includeInactiveDiscount?: boolean; now: number }): Promise<PricingQuote | null> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 20) return null
  const option = await db.prepare(`SELECT o.id, o.duration_months, o.discount_basis_points, o.currency, p.base_monthly_minor
    FROM admin_subscription_options o JOIN admin_products p ON p.id=o.product_id
    WHERE o.duration_months=? AND o.active=1 AND p.active=1 LIMIT 1`).bind(input.durationMonths).first<OptionRow>()
  const zone = await db.prepare(`SELECT country_code, currency, shipping_minor, additional_copy_minor, tax_rate_basis_points
    FROM admin_shipping_zones WHERE country_code=? AND active=1`).bind(input.countryCode).first<ZoneRow>()
  if (!option || !zone || option.currency !== zone.currency) return null

  const subtotalMinor = option.base_monthly_minor * option.duration_months * input.quantity
  let durationDiscountMinor = Math.round(subtotalMinor * option.discount_basis_points / 10000)
  let shippingMinor = zone.shipping_minor + zone.additional_copy_minor * Math.max(0, input.quantity - 1)
  let offerDiscountMinor = 0
  let discountId: string | null = null
  let promotion: PricingQuote['promotion'] = null
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
  const taxableMinor = Math.max(0, subtotalMinor-durationDiscountMinor-offerDiscountMinor+shippingMinor)
  const taxMinor = Math.round(taxableMinor * zone.tax_rate_basis_points / 10000)
  return { currency: option.currency, monthlyPriceMinor: option.base_monthly_minor, durationMonths: option.duration_months, quantity: input.quantity, subtotalMinor, durationDiscountMinor, offerDiscountMinor, shippingMinor, taxBasisPoints: zone.tax_rate_basis_points, taxMinor, totalMinor: taxableMinor+taxMinor, discountId, promotion, countryCode: zone.country_code }
}
