/** Provider acceptance is not proof of inbox delivery. Never log enquiry payloads. */
export async function forwardEnquiry(enquiry: Record<string,string>): Promise<boolean> {
  try {
    const response = await fetch('https://formsubmit.co/ajax/hello@offscrolltimes.com', {
      method: 'POST',
      headers: {'Content-Type':'application/json', Accept:'application/json'},
      body: JSON.stringify({...enquiry, _subject: `Offscroll Times enquiry ${enquiry.reference}`, _template:'table', _captcha:'false'}),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return false;
    const result = await response.json() as {success?:boolean|string};
    return result.success === true || result.success === 'true';
  } catch { return false; }
}
