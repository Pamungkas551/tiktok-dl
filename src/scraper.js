import axios from 'axios';
import * as cheerio from 'cheerio';
import { isTikTokUrl, resolveRedirectUrl } from './url-helper.js';

const UA_MOBILE = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function toAbsolute(url, base = 'https://tikwm.com') {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return base.replace(/\/+$/, '') + url;
  return `${base.replace(/\/+$/, '')}/${url}`;
}

/**
 * Normalize provider outputs into unified contract.
 */
export function normalizeResult(provider, data) {
  if (provider === 'tikwm') {
    const v = data;
    const author = v.author || {};
    return {
      provider: 'tikwm',
      id: v.id ? String(v.id) : Date.now().toString(),
      title: v.title || 'TikTok Video',
      author: {
        uniqueId: author.unique_id || 'tiktok_user',
        nickname: author.nickname || 'TikTok Creator',
        avatar: toAbsolute(author.avatar)
      },
      cover: toAbsolute(v.cover || v.origin_cover),
      duration: Number(v.duration) || 0,
      videoHd: toAbsolute(v.hdplay || v.play),
      videoSd: toAbsolute(v.play),
      music: toAbsolute(v.music),
      images: Array.isArray(v.images) ? v.images.map(img => toAbsolute(img)) : []
    };
  }

  if (provider === 'ssstik') {
    return {
      provider: 'ssstik',
      id: data.id || Date.now().toString(),
      title: data.title || 'TikTok Video',
      author: {
        uniqueId: data.author?.uniqueId || 'tiktok_user',
        nickname: data.author?.nickname || 'TikTok Creator',
        avatar: data.author?.avatar || null
      },
      cover: data.cover || null,
      duration: data.duration || 0,
      videoHd: data.videoHd || data.videoSd,
      videoSd: data.videoSd || data.videoHd,
      music: data.music || null,
      images: data.images || []
    };
  }

  if (provider === 'musicallydown') {
    return {
      provider: 'musicallydown',
      id: data.id || Date.now().toString(),
      title: data.title || 'TikTok Video',
      author: {
        uniqueId: data.author?.uniqueId || 'tiktok_user',
        nickname: data.author?.nickname || 'TikTok Creator',
        avatar: data.author?.avatar || null
      },
      cover: data.cover || null,
      duration: 0,
      videoHd: data.videoHd || data.videoSd,
      videoSd: data.videoSd || data.videoHd,
      music: data.music || null,
      images: []
    };
  }

  if (provider === 'yupra') {
    return {
      provider: 'yupra',
      id: data.id || Date.now().toString(),
      title: data.title || 'TikTok Video',
      author: {
        uniqueId: data.author?.uniqueId || 'tiktok_user',
        nickname: data.author?.nickname || 'TikTok Creator',
        avatar: data.author?.avatar || null
      },
      cover: data.cover || null,
      duration: data.duration || 0,
      videoHd: data.videoHd || data.videoSd,
      videoSd: data.videoSd || data.videoHd,
      music: data.music || null,
      images: data.images || []
    };
  }

  return data;
}

// 1. TikWM Engine
async function scrapeTikwm(url) {
  const params = new URLSearchParams();
  params.set('url', url);
  params.set('hd', '1');

  const res = await axios.post('https://tikwm.com/api/', params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': 'current_language=en',
      'User-Agent': UA_MOBILE
    },
    timeout: 12000
  });

  if (res.data?.code !== 0 || !res.data?.data) {
    throw new Error(res.data?.msg || 'TikWM parsing failed');
  }

  return normalizeResult('tikwm', res.data.data);
}

// 2. SSSTik Engine
async function scrapeSsstik(url) {
  const base = 'https://ssstik.io';
  const getPage = await axios.get(`${base}/en`, {
    headers: { 'User-Agent': UA_DESKTOP },
    timeout: 15000
  });

  const $ = cheerio.load(getPage.data);
  const form = $('form[hx-target="#target"]');
  const urlPost = form.attr('hx-post');
  const includeVals = form.attr('include-vals');

  if (!urlPost || !includeVals) {
    throw new Error('SSSTik form tokens missing');
  }

  const tt = includeVals.replace(/'/g, '').replace('tt:', '').split(',')[0];
  const ts = includeVals.split('ts:')[1];

  const postData = new URLSearchParams({
    id: url,
    locale: 'en',
    tt,
    ts
  });

  const dlRes = await axios.post(`${base}${urlPost}`, postData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': UA_DESKTOP,
      'HX-Request': 'true',
      'HX-Target': 'target',
      'HX-Current-URL': `${base}/en`,
      'Origin': base,
      'Referer': `${base}/en`
    },
    timeout: 20000
  });

  const $$ = cheerio.load(dlRes.data);
  const videoDirect = $$('a.without_watermark_direct').attr('href');
  const videoWithoutWm = $$('a.without_watermark').attr('href');
  const audioLink = $$('a.music').attr('href');
  const title = $$('p.maintext').text().trim();
  const avatar = $$('img.result_author').attr('src');

  const video = videoDirect || (videoWithoutWm ? (videoWithoutWm.startsWith('http') ? videoWithoutWm : base + videoWithoutWm) : null);

  if (!video && !audioLink) {
    throw new Error('SSSTik media stream not found');
  }

  return normalizeResult('ssstik', {
    title,
    author: { avatar },
    videoHd: video,
    videoSd: video,
    music: audioLink ? (audioLink.startsWith('http') ? audioLink : base + audioLink) : null
  });
}

// 3. MusicalDown Engine
async function scrapeMusicallydown(url) {
  const base = 'https://musicallydown.com';
  const getPage = await axios.get(`${base}/en`, {
    headers: { 'User-Agent': UA_DESKTOP },
    timeout: 15000
  });

  const $ = cheerio.load(getPage.data);
  const form = $('form');
  const inputs = form.find('input').toArray();

  if (inputs.length < 2) {
    throw new Error('MusicalDown form missing inputs');
  }

  const postData = new URLSearchParams();
  for (const el of inputs) {
    const name = $(el).attr('name');
    const value = $(el).attr('value') || '';
    if (name) {
      if ($(el).attr('type') === 'text' || name.toLowerCase().includes('url')) {
        postData.set(name, url);
      } else {
        postData.set(name, value);
      }
    }
  }

  const dlRes = await axios.post(`${base}/download`, postData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': UA_DESKTOP,
      'Origin': base,
      'Referer': `${base}/en`
    },
    timeout: 20000
  });

  const $$ = cheerio.load(dlRes.data);
  const videoLinks = $$('a')
    .toArray()
    .map(a => $$(a).attr('href'))
    .filter(h => h && /^https?:\/\//i.test(h) && (h.includes('.mp4') || h.includes('download') || h.includes('tiktok')));

  const title = $$('div.row h2 b').text().trim();
  const poster = $$('video#video').attr('poster');

  if (!videoLinks.length) {
    throw new Error('MusicalDown video link not found');
  }

  return normalizeResult('musicallydown', {
    title,
    cover: poster,
    videoHd: videoLinks[0],
    videoSd: videoLinks[1] || videoLinks[0]
  });
}

// 4. Yupra API Engine
async function scrapeYupra(url) {
  const api = `https://api.yupra.my.id/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
  const res = await axios.get(api, {
    headers: { 'User-Agent': UA_MOBILE },
    timeout: 15000
  });

  const json = res.data;
  if (json?.status !== 200 || !json?.result?.data) {
    throw new Error('Yupra parsing failed');
  }

  const media = json.result.data;
  const findType = (...types) => types.map(t => media.find(m => m.type === t)?.url).find(Boolean) || null;

  const videoHd = findType('nowatermark_hd', 'nowatermark');
  const videoSd = findType('nowatermark', 'watermark');
  const music = findType('music');

  if (!videoHd && !videoSd && !music) {
    throw new Error('Yupra no stream found');
  }

  return normalizeResult('yupra', {
    title: json.result.title,
    cover: json.result.cover,
    videoHd,
    videoSd,
    music
  });
}

/**
 * Main scraper pipeline with multi-engine fallback.
 */
export async function resolveTikTokMedia(inputUrl) {
  if (!isTikTokUrl(inputUrl)) {
    throw new Error('URL TikTok tidak valid');
  }

  const canonicalUrl = await resolveRedirectUrl(inputUrl);

  const engines = [
    { name: 'tikwm', fn: () => scrapeTikwm(canonicalUrl) },
    { name: 'ssstik', fn: () => scrapeSsstik(canonicalUrl) },
    { name: 'yupra', fn: () => scrapeYupra(canonicalUrl) },
    { name: 'musicallydown', fn: () => scrapeMusicallydown(canonicalUrl) }
  ];

  const errors = [];

  for (const engine of engines) {
    try {
      const data = await engine.fn();
      if (data && (data.videoHd || data.videoSd || data.music || (data.images && data.images.length > 0))) {
        return data;
      }
    } catch (err) {
      errors.push(`${engine.name}: ${err.message}`);
    }
  }

  const failError = new Error('Semua mesin downloader gagal memproses video ini. Pastikan video publik dan tidak di-private.');
  failError.details = errors;
  throw failError;
}
