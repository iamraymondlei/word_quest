import { Router, Request, Response } from 'express';
import http from 'http';

const router = Router();

const MINIO_HOST = process.env.MINIO_HOST || 'minio-prod';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'wordquest-stories';

/**
 * GET /api/illustrations/:filename(*)
 * Proxies requested illustration from MinIO object storage with long-term immutable caching.
 */
router.get('/:filename(*)', (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const minioPath = `/${MINIO_BUCKET}/${encodeURIComponent(filename).replace(/%2F/g, '/')}`;

  const options = {
    hostname: MINIO_HOST,
    port: MINIO_PORT,
    path: minioPath,
    method: 'GET',
    timeout: 10000,
  };

  const proxyReq = http.request(options, (minioRes) => {
    if (minioRes.statusCode !== 200) {
      return res.status(minioRes.statusCode || 404).json({
        error: `Illustration not found in storage (HTTP ${minioRes.statusCode})`,
      });
    }

    // Set immutable long-term caching headers for PWA and browsers
    res.setHeader('Content-Type', minioRes.headers['content-type'] || 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (minioRes.headers['content-length']) {
      res.setHeader('Content-Length', minioRes.headers['content-length']);
    }

    minioRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`Error streaming illustration from MinIO (${filename}):`, err.message);
    res.status(502).json({ error: 'Failed to retrieve illustration from storage' });
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.status(504).json({ error: 'Illustration storage request timed out' });
  });

  proxyReq.end();
});

export default router;
