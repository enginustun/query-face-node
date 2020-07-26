const { testQuery, releaseQuery } = require('../middleware/query-face');
const QueryFaceResponse = require('../models/query-face-response');
const logger = require('./../utils/logger');

module.exports = async function(req, res, next) {
  logger.info(`> router: release-query`);
  const {
    queries = [],
    queryName: multiQueryName,
    dependent,
    transaction,
  } = req.body;
  const isMultiQuery = multiQueryName && queries.length > 1;
  let errors = [];
  let result = false;

  const queryResults = (await testQuery(req, res, next).then(res => res)) || [];
  errors = [...errors, ...queryResults.filter(r => r.error)];

  if (errors.length === 0) {
    let promiseArray = [];
    if (isMultiQuery) {
      const { _releaseParams = {} } = queries[0].params || {};
      const originalQueryTemplate = JSON.stringify({
        queries: queries.map(query => ({
          dbName: query.dbName,
          query: JSON.parse(query.originalQueryTemplate),
          responseAlias: query.responseAlias,
        })),
      });
      promiseArray = [
        releaseQuery(
          '-',
          multiQueryName,
          originalQueryTemplate,
          _releaseParams,
          dependent,
          transaction
        ),
      ];
    } else {
      promiseArray = queries.map(currentQuery => {
        const {
          dbName,
          queryName,
          originalQueryTemplate,
          params: { _releaseParams = {} } = {},
        } = currentQuery;
        return releaseQuery(
          dbName,
          queryName,
          originalQueryTemplate,
          _releaseParams,
          dependent,
          transaction
        );
      });
    }
    result = await Promise.all(promiseArray)
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
