import { createMiddleware, createStart } from '@tanstack/react-start'

export const CANONICAL_ORIGIN = 'https://offscrolltimes.com'
const CANONICAL_HOSTNAME = new URL(CANONICAL_ORIGIN).hostname
const CUSTOM_HOSTNAMES = new Set([CANONICAL_HOSTNAME, `www.${CANONICAL_HOSTNAME}`])

function redirectToCanonical(url: URL, status: 302 | 308): Response {
  return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, status)
}

export function canonicalEntryRedirect(request: Request): Response | null {
  const url = new URL(request.url)

  // Every accepted custom-domain URL has one permanent public identity:
  // HTTPS on the apex hostname. A 308 preserves the method and body if an
  // old client ever sends a non-GET request to http:// or www.
  if (
    CUSTOM_HOSTNAMES.has(url.hostname) &&
    (url.protocol !== 'https:' || url.hostname !== CANONICAL_HOSTNAME)
  ) {
    return redirectToCanonical(url, 308)
  }

  return null
}

function applyGlobalSecurityHeaders(response:Response){const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(self)');headers.set('Cross-Origin-Opener-Policy','same-origin-allow-popups');headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}

const canonicalHost = createMiddleware().server(async ({ next, request }) => {
  const redirect = canonicalEntryRedirect(request)
  if (redirect) return redirect

  const result = await next()
  return {
    ...result,
    response: applyGlobalSecurityHeaders(result.response),
  }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [canonicalHost],
}))
