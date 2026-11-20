const serverless = require('../dist/src/serverless');

const handler = serverless.default || serverless;

module.exports = async (req, res) => {
  return handler(req, res);
};
