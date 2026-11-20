const path = require('path');
const fs = require('fs');

let cachedHandler = null;

function loadHandler() {
  if (cachedHandler) return cachedHandler;

  const candidatePaths = [
    path.join(__dirname, 'dist', 'src', 'serverless.js'),
    path.join(__dirname, '..', 'apps', 'api', 'api', 'dist', 'src', 'serverless.js'),
    path.join(__dirname, '..', 'apps', 'api', 'dist', 'src', 'serverless.js'),
    path.join(process.cwd(), 'apps', 'api', 'api', 'dist', 'src', 'serverless.js'),
    path.join(process.cwd(), 'apps', 'api', 'dist', 'src', 'serverless.js'),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const mod = require(p);
        cachedHandler = mod.default || mod;
        console.log('[Root API] Handler loaded successfully from:', p);
        return cachedHandler;
      }
    } catch (e) {
      console.error('[Root API] Failed loading from:', p, e);
    }
  }

  throw new Error('Root serverless handler could not find serverless bundle');
}

module.exports = async (req, res) => {
  if (!req.socket) {
    req.socket = {};
  }
  if (!req.socket.remoteAddress) {
    req.socket.remoteAddress =
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers?.['x-real-ip'] ||
      '127.0.0.1';
  }
  if (!req.ip) {
    req.ip = req.socket.remoteAddress;
  }

  const origin = req.headers?.origin || 'https://ebook-olive-one.vercel.app';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,x-request-id,Accept,Origin,X-Requested-With',
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.end();
  }

  try {
    const handler = loadHandler();
    return await handler(req, res);
  } catch (err) {
    console.error('[Root API] Error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'ROOT_SERVERLESS_INVOCATION_ERROR',
        message: err.message,
        stack: err.stack,
      }),
    );
  }
};
