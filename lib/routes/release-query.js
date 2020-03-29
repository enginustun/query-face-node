const { getQueryResult, releaseQuery } = require('../middleware/query-face');
const QueryFaceResponse = require('../models/query-face-response');
module.exports = async function(req, res, next) {
  const { queries = [] } = req.body;
  let error;
  const result = await Promise.all(
    queries.map(currentQuery => {
      const { queryName, dbName, originalQueryTemplate } = currentQuery;
      return releaseQuery(queryName, dbName, originalQueryTemplate);
    })
  )
    .then(res => !res.some(item => item === 0))
    .catch(err => {
      error = err;
      return false;
    });
  const queryResults = await getQueryResult(req, res, next).then(res => res);

  res.status(200).send(
    new QueryFaceResponse({
      results: [result, ...queryResults],
      errors: [error],
    }).toResponse()
  );
};
