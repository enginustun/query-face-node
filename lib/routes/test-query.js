const { testQuery } = require('../middleware/query-face');
const QueryFaceResponse = require('../models/query-face-response');
const logger = require('./../utils/logger');
module.exports = async function(req, res) {
  logger.info(`> router: test-query`);
  const results = await testQuery(req)
    .then(res => res)
    .catch(error => {
      res
        .status(400)
        .send(QueryFaceResponse({ errors: [{ message: error.toString() }] }));
    });

  logger.info(`> router: test-query finished`);
  logger.debug(`> router: test-query finished results: %o`, results);
  res.status(200).send(
    QueryFaceResponse({
      results: results.filter(r => !r.error),
      errors: results.filter(r => r.error),
    })
  );
};
