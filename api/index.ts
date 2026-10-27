import express from 'express';
import { apiRouter } from '../src/server/apiRouter.ts';
import { apiRouterV1 } from '../src/server/wapay/apiRouterV1.ts';

const app = express();

app.use(express.json());

// Unified FinTech API v1
app.use('/api/v1', apiRouterV1);

// Legacy API Router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: 'vercel-serverless',
    timestamp: new Date().toISOString()
  });
});

export default app;
