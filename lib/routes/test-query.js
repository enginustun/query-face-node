const { getQueryResult } = require('../middleware/query-face');
const QueryFaceResponse = require('../models/query-face-response');
module.exports = async function(req, res, next) {
  const results = await getQueryResult(req, res, next)
    .then(res => res)
    .catch(error => {
      res.status(400).send(
        new QueryFaceResponse({
          errors: [{ message: error.toString() }],
        }).toResponse()
      );
    });
  res.status(200).send(
    new QueryFaceResponse({
      results: results.map(r => (!r.error ? r : [])),
      errors: results.filter(r => r.error),
    }).toResponse()
  );
};
