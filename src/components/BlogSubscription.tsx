import { BLOG_SIGNUP_URL } from '#/content/site'
import { CTA } from '#/lib/uiKit'

/** A hosted signup form owns email consent, confirmation and unsubscribe handling. */
export function BlogSubscription() {
  return <div className="min-w-0 sm:col-span-2 lg:col-span-4">
    <h2 className="m-0 font-display text-2xl font-bold">Stay in loop, OFFSCROLLERS!</h2>
    {BLOG_SIGNUP_URL ? <a href={BLOG_SIGNUP_URL} className={`${CTA} mt-4`}>Subscribe</a> : <>
      <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Email address for blog updates</span>
          <input type="email" autoComplete="email" placeholder="Email address" disabled aria-describedby="footer-signup-status" className="w-full rounded-full border border-graphite bg-paper px-5 py-4 text-base text-graphite disabled:cursor-not-allowed" />
        </label>
        <button type="button" disabled aria-describedby="footer-signup-status" className={`${CTA} disabled:cursor-not-allowed disabled:opacity-60`}>Subscribe</button>
      </div>
      <p id="footer-signup-status" className="mt-2 text-sm text-graphite-soft">Email signup coming soon.</p>
    </>}
  </div>
}
