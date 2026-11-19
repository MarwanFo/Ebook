const handler = require('../apps/api/dist/src/serverless').default;

module.exports = (req, res) => {
  return handler(req, res);
};
