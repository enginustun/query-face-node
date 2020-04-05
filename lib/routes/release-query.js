const { testQuery, releaseQuery } = require('../middleware/query-face');
const QueryFaceResponse = require('../models/query-face-response');
const logger = require('./../utils/logger');

module.exports = async function(req, res, next) {
  logger.info(`> router: release-query`);
  const { queries = [] } = req.body;
  let errors = [];
  let result = false;

  const queryResults = (await testQuery(req, res, next).then(res => res)) || [];
  errors = [...errors, ...queryResults.filter(r => r.error)];

  if (errors.length === 0) {
    result = await Promise.all(
      queries.map(currentQuery => {
        const {
          queryName,
          dbName,
          originalQueryTemplate,
          params: { _releaseParams = {} } = {},
        } = currentQuery;
        return releaseQuery(
          queryName,
          dbName,
          originalQueryTemplate,
          _releaseParams
        );
      })
    )
      .then(res => (Array.isArray(res[0]) ? res[0][0] : res[0])) //!res.some(item => item === 0)
      .catch(err => {
        errors = [...errors, { error: true, message: err.message }];
        return false;
      });
  }

  logger.info(`> router: release-finished`);
  logger.debug(
    `> router: release-query finished, result: %o, errors: %o`,
    result,
    errors
  );
  res
    .status(200)
    .send(QueryFaceResponse({ results: [result, ...queryResults], errors }));
};
