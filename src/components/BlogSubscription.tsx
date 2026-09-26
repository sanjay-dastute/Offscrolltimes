import { Reveal } from '#/components/Reveal'
import { BLOG_SIGNUP_URL } from '#/content/site'
import { CTA, EYEBROW, H2, SHELL } from '#/lib/uiKit'

/** A hosted signup form owns email consent, confirmation and unsubscribe handling. */
export function BlogSubscription() {
  return <section className="border-y border-graphite bg-[#e3ece3]" aria-labelledby="blog-subscription-title">
    <Reveal className={`${SHELL} grid items-center gap-7 py-14 md:grid-cols-[minmax(0,1fr)_auto] md:py-20`}>
      <div>
        <p className={`${EYEBROW} text-graphite-mute`}>The Offscroll Times blog</p>
        <h2 id="blog-subscription-title" className={H2}>A little curiosity in your inbox.</h2>
        <p className="mt-4 max-w-[55ch] leading-relaxed text-graphite-soft">Subscribe for blog updates, curious discoveries and ideas for your next screen-free break.</p>
        <p className="mt-3 text-sm text-graphite-soft">Blog updates are separate from your printed newspaper subscription.</p>
      </div>
      {BLOG_SIGNUP_URL ? <a href={BLOG_SIGNUP_URL} className={`${CTA} text-center`}>Subscribe to the blog</a> : <p className="rounded-2xl border border-graphite bg-paper-raised px-6 py-4 text-center font-display text-lg font-semibold">Blog updates coming soon</p>}
    </Reveal>
  </section>
}
