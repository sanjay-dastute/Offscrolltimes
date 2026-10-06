import { CTA,H2 } from '#/lib/uiKit'

export function AdminExports(){
  return <section className="max-w-2xl"><h2 className={H2}>Delivery print list</h2><p className="mt-3 text-graphite-soft">Download the latest active, paid customer details at any time. The PDF uses the customer’s most recently saved name, delivery address and phone number. Inactive and unpaid customers are excluded.</p><div className="mt-6 rounded-2xl border border-graphite bg-paper p-6"><a className={`${CTA} inline-flex text-center`} href="/api/admin/dispatch?format=pdf">Download current delivery PDF</a></div></section>
}
