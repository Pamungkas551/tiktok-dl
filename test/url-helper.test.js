import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isTikTokUrl, cleanTikTokUrl } from '../src/url-helper.js';

describe('url-helper', () => {
  describe('isTikTokUrl', () => {
    it('returns true for standard tiktok video URL', () => {
      assert.equal(isTikTokUrl('https://www.tiktok.com/@khaby.lame/video/7106594312292453678'), true);
    });

    it('returns true for vt.tiktok.com short URL', () => {
      assert.equal(isTikTokUrl('https://vt.tiktok.com/ZS2xJqY8P/'), true);
    });

    it('returns true for vm.tiktok.com short URL', () => {
      assert.equal(isTikTokUrl('https://vm.tiktok.com/ZM2xJqY8P/'), true);
    });

    it('returns false for non-tiktok URL', () => {
      assert.equal(isTikTokUrl('https://www.instagram.com/reel/12345'), false);
      assert.equal(isTikTokUrl('https://youtube.com/shorts/12345'), false);
      assert.equal(isTikTokUrl('not a url'), false);
    });
  });

  describe('cleanTikTokUrl', () => {
    it('strips tracking query parameters', () => {
      const dirty = 'https://www.tiktok.com/@user/video/7106594312292453678?is_from_webapp=1&sender_device=pc&share_id=123';
      const clean = cleanTikTokUrl(dirty);
      assert.equal(clean, 'https://www.tiktok.com/@user/video/7106594312292453678');
    });

    it('preserves clean URL as-is', () => {
      const url = 'https://vt.tiktok.com/ZS2xJqY8P/';
      assert.equal(cleanTikTokUrl(url), 'https://vt.tiktok.com/ZS2xJqY8P/');
    });
  });
});
