module.exports = async (req, res) => {
  try {
    const handler = require('../apps/api/dist/src/serverless').default;
    return await handler(req, res);
  } catch (err) {
    console.error('Serverless bootstrap error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'SERVERLESS_BOOTSTRAP_ERROR',
        message: err.message,
        stack: err.stack,
      }),
    );
  }
};
