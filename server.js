import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isTikTokUrl } from './src/url-helper.js';
import { resolveTikTokMedia } from './src/scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UA_STREAM = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files (local dev & fallback)
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // Router for API endpoints (handles both with and without /api prefix)
  const apiRouter = express.Router();

  // Analyze TikTok URL
  apiRouter.post('/analyze', async (req, res) => {
    const { url } = req.body || {};

    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: 'URL TikTok wajib diisi'
      });
    }

    const trimmedUrl = url.trim();

    if (!isTikTokUrl(trimmedUrl)) {
      return res.status(400).json({
        success: false,
        message: 'URL TikTok tidak valid. Gunakan format vt.tiktok.com atau tiktok.com/@user/video/...'
      });
    }

    try {
      const media = await resolveTikTokMedia(trimmedUrl);
      
      const safeId = media.id ? media.id.replace(/[^a-zA-Z0-9_-]/g, '') : Date.now().toString();

      const proxyDownloadUrls = {
        videoHd: media.videoHd ? `/api/download?url=${encodeURIComponent(media.videoHd)}&filename=tiktok_${safeId}_hd.mp4` : null,
        videoSd: media.videoSd ? `/api/download?url=${encodeURIComponent(media.videoSd)}&filename=tiktok_${safeId}_sd.mp4` : null,
        music: media.music ? `/api/download?url=${encodeURIComponent(media.music)}&filename=tiktok_${safeId}_audio.mp3` : null
      };

      const proxyStreamUrls = {
        video: media.videoHd ? `/api/stream?url=${encodeURIComponent(media.videoHd)}` : (media.videoSd ? `/api/stream?url=${encodeURIComponent(media.videoSd)}` : null),
        music: media.music ? `/api/stream?url=${encodeURIComponent(media.music)}` : null
      };

      return res.json({
        success: true,
        data: {
          ...media,
          downloads: proxyDownloadUrls,
          streams: proxyStreamUrls
        }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Gagal memproses video',
        details: err.details || null
      });
    }
  });

  // Stream Proxy (Supports Range headers for video/audio player scrubbing)
  apiRouter.get('/stream', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'URL stream wajib disertakan' });
    }

    try {
      const headers = {
        'User-Agent': UA_STREAM,
        'Referer': 'https://www.tiktok.com/'
      };

      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const streamRes = await axios({
        method: 'GET',
        url: targetUrl,
        responseType: 'stream',
        headers,
        timeout: 25000,
        validateStatus: (status) => status >= 200 && status < 400
      });

      if (streamRes.headers['content-type']) {
        res.setHeader('Content-Type', streamRes.headers['content-type']);
      }
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }
      if (streamRes.headers['content-range']) {
        res.setHeader('Content-Range', streamRes.headers['content-range']);
      }
      if (streamRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', streamRes.headers['accept-ranges']);
      }

      res.status(streamRes.status);
      streamRes.data.pipe(res);
    } catch (err) {
      if (!res.headersSent) {
        return res.status(502).json({
          success: false,
          message: 'Gagal melakukan stream media',
          error: err.message
        });
      }
    }
  });

  // Direct File Downloader Proxy
  apiRouter.get('/download', async (req, res) => {
    const targetUrl = req.query.url;
    const customFilename = req.query.filename || `tiktok_${Date.now()}.mp4`;

    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'URL media wajib disertakan' });
    }

    const safeFilename = customFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

    try {
      const streamRes = await axios({
        method: 'GET',
        url: targetUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': UA_STREAM,
          'Referer': 'https://www.tiktok.com/'
        },
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 400
      });

      const contentType = streamRes.headers['content-type'] || (safeFilename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');

      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Type', contentType);
      if (streamRes.headers['content-length']) {
        res.setHeader('Content-Length', streamRes.headers['content-length']);
      }

      streamRes.data.pipe(res);
    } catch (err) {
      if (!res.headersSent) {
        return res.status(502).json({
          success: false,
          message: 'Gagal mengunduh file media dari server',
          error: err.message
        });
      }
    }
  });

  // Mount API router to both /api and / so it works seamlessly on Vercel and local
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // Fallback for SPA routing to index.html if file exists (local dev)
  app.get('*', (req, res, next) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
      });
    }
  });

  return app;
}

// Start standalone server if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const PORT = process.env.PORT || 3000;
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Neubrutalism TikTok Downloader aktif di http://localhost:${PORT}`);
  });
}
