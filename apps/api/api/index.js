const path = require('path');
const fs = require('fs');

let cachedHandler = null;

function loadHandler() {
  if (cachedHandler) return cachedHandler;

  const candidates = [
    path.join(__dirname, 'dist', 'src', 'serverless.js'),
    path.join(__dirname, '..', 'dist', 'src', 'serverless.js'),
    path.join(process.cwd(), 'dist', 'src', 'serverless.js'),
    path.join(process.cwd(), 'apps', 'api', 'dist', 'src', 'serverless.js'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const mod = require(candidate);
        cachedHandler = mod.default || mod;
        console.log('[API] Handler successfully loaded from:', candidate);
        return cachedHandler;
      }
    } catch (e) {
      console.error('[API] Error loading from candidate', candidate, e);
    }
  }

  try {
    const mod = require('./dist/src/serverless');
    cachedHandler = mod.default || mod;
    return cachedHandler;
  } catch (e1) {
    try {
      const mod = require('../dist/src/serverless');
      cachedHandler = mod.default || mod;
      return cachedHandler;
    } catch (e2) {
      throw new Error(`Failed to load serverless handler. e1: ${e1.message}, e2: ${e2.message}`);
    }
  }
}

module.exports = async (req, res) => {
  const origin = req.headers?.origin || 'https://ebook-olive-one.vercel.app';

  // Set permissive CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,x-request-id,Accept,Origin,X-Requested-With',
  );

  // Handle OPTIONS preflight immediately
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.end();
  }

  try {
    const handler = loadHandler();
    return await handler(req, res);
  } catch (err) {
    console.error('[API] Invocation error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'SERVERLESS_FUNCTION_ERROR',
        message: err.message,
        stack: err.stack,
        cwd: process.cwd(),
        dirname: __dirname,
      }),
    );
  }
};
