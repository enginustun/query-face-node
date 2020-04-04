const { getQueryResult, releaseQuery } = require('../middleware/query-face');
const QueryFaceResponse = require('../models/query-face-response');
module.exports = async function(req, res, next) {
  const { queries = [] } = req.body;
  let errors = [];
  let result = false;

  const queryResults =
    (await getQueryResult(req, res, next).then(res => res)) || [];
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
          _releaseParams.groupId
        );
      })
    )
      .then(res => !res.some(item => item === 0))
      .catch(err => {
        errors = [...errors, { error: true, message: err.message }];
        return false;
      });
  }

  res
    .status(200)
    .send(QueryFaceResponse({ results: [result, ...queryResults], errors }));
};
