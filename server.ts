import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/apiRouter.ts';
import { apiRouterV1 } from './src/server/wapay/apiRouterV1.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// WA Pay v1 Unified FinTech API
app.use('/api/v1', apiRouterV1);

// Legacy API endpoints
app.use('/api', apiRouter);

// Download project zip directly
app.get('/download-zip', (_req, res) => {
  const zipPath = path.resolve(__dirname, 'public', 'wa-monetizer.zip');
  res.download(zipPath, 'wa-monetizer.zip');
});

// Serve static assets in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to SPA index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`WA Monetizer server running on port ${PORT}`);
});
