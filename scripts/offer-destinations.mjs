// This provider uses the owner-supplied referral URL, not a GetYourGuide activity ID.
export function isWelcomeCardHost(hostname) {
  return hostname.toLowerCase() === 'istanbulwelcomecard.com';
}

export function welcomeCardUrlErrors(value) {
  let url;
  try { url = new URL(value); } catch { return ['Invalid Istanbul Welcome Card URL.']; }
  const errors = [];
  if (url.protocol !== 'https:' || !isWelcomeCardHost(url.hostname) || url.port || url.username || url.password) {
    errors.push('Use HTTPS on istanbulwelcomecard.com without credentials or a custom port.');
  }
  if (url.pathname !== '/shop/hagia-sophia-tour' || url.hash) errors.push('Preserve the reviewed Hagia Sophia product path without a fragment.');
  if (url.searchParams.getAll('ref').length !== 1 || url.searchParams.get('ref') !== 'iti5') errors.push('Preserve exactly one ref=iti5 parameter for the reviewed price.');
  if ([...url.searchParams.keys()].some(key => key !== 'ref')) errors.push('Unexpected parameters on the reviewed offer URL.');
  return errors;
}
