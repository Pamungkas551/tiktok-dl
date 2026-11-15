import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResult, resolveTikTokMedia } from '../src/scraper.js';

describe('scraper', () => {
  describe('normalizeResult', () => {
    it('normalizes raw tikwm payload into unified contract', () => {
      const rawTikwm = {
        id: '7106594312292453678',
        title: 'Hilarious video caption',
        duration: 15,
        cover: 'https://tikwm.com/cover.jpg',
        play: '/video/media/play.mp4',
        hdplay: 'https://tikwm.com/video/hd.mp4',
        music: '/music/sound.mp3',
        author: {
          unique_id: 'khaby.lame',
          nickname: 'Khaby Lame',
          avatar: 'https://tikwm.com/avatar.jpg'
        },
        images: null
      };

      const result = normalizeResult('tikwm', rawTikwm);
      assert.equal(result.provider, 'tikwm');
      assert.equal(result.id, '7106594312292453678');
      assert.equal(result.title, 'Hilarious video caption');
      assert.equal(result.author.uniqueId, 'khaby.lame');
      assert.equal(result.author.nickname, 'Khaby Lame');
      assert.equal(result.videoHd, 'https://tikwm.com/video/hd.mp4');
      assert.equal(result.videoSd, 'https://tikwm.com/video/media/play.mp4');
      assert.equal(result.music, 'https://tikwm.com/music/sound.mp3');
    });

    it('handles relative paths by prepending tikwm origin', () => {
      const raw = {
        play: '/play.mp4',
        hdplay: '/hd.mp4',
        music: '/audio.mp3'
      };
      const result = normalizeResult('tikwm', raw);
      assert.equal(result.videoSd, 'https://tikwm.com/play.mp4');
      assert.equal(result.videoHd, 'https://tikwm.com/hd.mp4');
      assert.equal(result.music, 'https://tikwm.com/audio.mp3');
    });
  });

  describe('resolveTikTokMedia validation', () => {
    it('throws error on empty or invalid url', async () => {
      await assert.rejects(
        () => resolveTikTokMedia(''),
        { message: 'URL TikTok tidak valid' }
      );
      await assert.rejects(
        () => resolveTikTokMedia('https://google.com'),
        { message: 'URL TikTok tidak valid' }
      );
    });
  });
});
