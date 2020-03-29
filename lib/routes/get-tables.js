const databases = require('../databases');
const { listTables } = require('../utils/helpers');
const QueryFaceResponse = require('../models/query-face-response');
module.exports = async function(req, res, next) {
  let error;
  let tables = [];
  const { queries = [] } = req.body;
  const query = queries[0];
  if (query) {
    try {
      const { dbName } = query;
      tables = await listTables(databases.getDatabase(dbName));
    } catch (err) {
      error = err;
    }
  }
  res.status(200).send(
    new QueryFaceResponse({
      results: [tables],
      errors: [error],
    }).toResponse()
  );
};
