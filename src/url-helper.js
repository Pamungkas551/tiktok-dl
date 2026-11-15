import axios from 'axios';

const TIKTOK_DOMAINS = [
  'tiktok.com',
  'www.tiktok.com',
  'vt.tiktok.com',
  'vm.tiktok.com',
  'm.tiktok.com',
  't.tiktok.com'
];

/**
 * Check if the input is a valid TikTok URL.
 * @param {string} urlString
 * @returns {boolean}
 */
export function isTikTokUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString.trim());
    const host = parsed.hostname.toLowerCase();
    return TIKTOK_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
  } catch {
    return false;
  }
}

/**
 * Strip tracking and referral query parameters from TikTok URL.
 * @param {string} urlString
 * @returns {string}
 */
export function cleanTikTokUrl(urlString) {
  try {
    const parsed = new URL(urlString.trim());
    // Strip unnecessary tracking params
    const removeParams = ['is_from_webapp', 'sender_device', 'share_id', 'is_copy_url', 'source', 'utm_source'];
    for (const p of removeParams) {
      parsed.searchParams.delete(p);
    }
    // If query string is now empty, return origin + pathname
    const query = parsed.searchParams.toString();
    return query ? `${parsed.origin}${parsed.pathname}?${query}` : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return urlString;
  }
}

/**
 * Follow HTTP redirects (for short links vt.tiktok.com, vm.tiktok.com).
 * @param {string} urlString
 * @returns {Promise<string>} Canonical destination URL
 */
export async function resolveRedirectUrl(urlString) {
  const cleaned = cleanTikTokUrl(urlString);
  try {
    const response = await axios.get(cleaned, {
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      validateStatus: () => true, // don't throw on 3xx/4xx
      timeout: 8000
    });
    
    // axios stores the final redirected URL in response.request.res.responseUrl or config.url
    const finalUrl = response.request?.res?.responseUrl || response.config?.url || cleaned;
    return cleanTikTokUrl(finalUrl);
  } catch {
    return cleaned;
  }
}
