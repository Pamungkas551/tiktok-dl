import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

describe('server API', () => {
  let server;
  let baseUrl;

  before(async () => {
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('POST /api/analyze', () => {
    it('returns 400 when url is missing or empty', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' })
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /URL TikTok wajib diisi/i);
    });

    it('returns 400 when url is not a tiktok domain', async () => {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://youtube.com/watch?v=123' })
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /URL TikTok tidak valid/i);
    });
  });

  describe('GET /api/download', () => {
    it('returns 400 if url query param is missing', async () => {
      const res = await fetch(`${baseUrl}/api/download`);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.match(json.message, /URL media wajib disertakan/i);
    });
  });

  describe('Static files serving', () => {
    it('serves index.html at root', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.match(text, /TIKTOK\.DL/);
      assert.match(text, /Space\+Grotesk/);
    });

    it('serves style.css', async () => {
      const res = await fetch(`${baseUrl}/style.css`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.match(text, /--shadow: 5px 5px 0 0 #000000;/);
    });

    it('serves app.js', async () => {
      const res = await fetch(`${baseUrl}/app.js`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.match(text, /tiktok_dl_history_v1/);
    });
  });
});
