const databases = require('../databases');
const { getUniqueCountBy } = require('../utils/helpers');
const {
  getExecutableQuery,
  getExecutionResult,
} = require('../utils/query-face-helpers');
const { queryFaceError, ERROR_CODE } = require('../utils/errors');
const logger = require('../utils/logger');
const QueryFaceResponse = require('../models/query-face-response');

const execQueriesWithTransaction = async (req, res) => {
  const { queries = [] } = req.body;
  const uniqueDbNameCount = getUniqueCountBy(queries, 'dbName');
  let trxName;
  if (queries.length > 1 && uniqueDbNameCount !== 1) {
    queryFaceError(ERROR_CODE.MUST_ALL_SAME);
  }
  trxName = queries[0].dbName;
  let db = databases.getDatabase(trxName);
  if (!db) {
    queryFaceError(ERROR_CODE.NOT_FOUND, 'dbName', trxName);
  }

  return await db.transaction(queryBuilderTrx => {
    return Promise.all(
      queries.map(currentQuery => {
        const { query } = currentQuery;
        let executableQuery = getExecutableQuery(db, query);

        executableQuery.transacting(queryBuilderTrx);

        return getExecutionResult(executableQuery, currentQuery, req, res);
      })
    );
  });
};

const execQueriesWithDependency = async function(req, res) {
  const { queries = [] } = req.body;
  const uniqueDbNameCount = getUniqueCountBy(queries, 'dbName');
  let trxName;
  if (queries.length > 1 && uniqueDbNameCount !== 1) {
    queryFaceError(ERROR_CODE.MUST_ALL_SAME);
  }
  trxName = queries[0].dbName;
  let db = databases.getDatabase(trxName);
  if (!db) {
    queryFaceError(ERROR_CODE.NOT_FOUND, 'dbName', trxName);
  }
  const responseAliasMap = {};

  return await db.transaction(async queryBuilderTrx => {
    const results = [];
    for (let i = 0; i < queries.length; i++) {
      const currentQuery = queries[i];
      const { query, responseAlias } = currentQuery;
      let executableQuery = getExecutableQuery(db, query, responseAliasMap);
      executableQuery.transacting(queryBuilderTrx);
      const queryResult = await getExecutionResult(
        executableQuery,
        currentQuery,
        req,
        res
      );
      if (responseAlias && Array.isArray(queryResult)) {
        responseAliasMap[responseAlias] = queryResult[0];
      }
      results.push(queryResult);
    }
    return results;
  });
};

const execQueriesDirectly = async (req, res) => {
  const { queries = [] } = req.body;

  return Promise.all(
    queries.map(currentQuery => {
      const { query, queryName, dbName } = currentQuery;
      const db = databases.getDatabase(dbName);
      if (!db) {
        queryFaceError(ERROR_CODE.NOT_FOUND, 'dbName', dbName);
      }

      let executableQuery = getExecutableQuery(db, query);
      logger.info(
        `> execQueriesDirectly: trying to exec query: [${queryName}]`
      );
      return getExecutionResult(executableQuery, currentQuery, req, res).catch(
        err => ({ error: true, message: err.detail || err.toString() })
      );
    })
  );
};

const execQueries = async (req, res, next) => {
  let results = [];
  try {
    const { transaction = false, dependent = false } = req.body;
    if (dependent) {
      logger.info(`> execQueriesWithDependency is started`);
      results = await execQueriesWithDependency(req, res, next);
    } else if (transaction) {
      logger.info(`> execQueriesWithTransaction is started`);
      results = await execQueriesWithTransaction(req, res, next, transaction);
    } else {
      logger.info(`> execQueriesDirectly is started`);
      results = await execQueriesDirectly(req, res, next);
    }

    if (!res.headersSent) {
      res.status(200).send(
        QueryFaceResponse({
          results: results.filter(r => !r.error),
          errors: results.filter(r => r.error),
        })
      );
    }
  } catch (err) {
    if (!res.headersSent) {
      logger.error(`> an error occured: %o`, err);
      res
        .status(400)
        .send(QueryFaceResponse({ errors: [{ message: err.toString() }] }));
    }
  }
};

const testQuery = function(req) {
  logger.info(`> testQuery is started`);
  return new Promise((resolve, reject) => {
    const { queries = [] } = req.body;
    const uniqueDbNameCount = getUniqueCountBy(queries, 'dbName');
    let trxName;
    if (queries.length > 1 && uniqueDbNameCount !== 1) {
      queryFaceError(ERROR_CODE.MUST_ALL_SAME);
    }
    trxName = queries[0].dbName;
    let db = databases.getDatabase(trxName);
    if (!db) {
      queryFaceError(ERROR_CODE.NOT_FOUND, 'dbName', trxName);
    }

    db.transaction(queryBuilderTrx => {
      Promise.all(
        queries.map(currentQuery => {
          const { query } = currentQuery;
          let executableQuery = getExecutableQuery(db, query);
          executableQuery.transacting(queryBuilderTrx);
          return executableQuery
            .then(queryResult => {
              currentQuery.queryResult = queryResult;
              return typeof queryResult === 'number'
                ? queryResult.toString()
                : queryResult;
            })
            .catch(err => {
              logger.error(err);
              currentQuery.queryError = err;
              return { error: true, message: err.detail || err.toString() };
            });
        })
      )
        .then(res => {
          logger.info(`> testQuery is finished, rollbacked`);
          queryBuilderTrx.rollback && queryBuilderTrx.rollback();
          resolve(res);
        })
        .catch(err => {
          logger.error(
            `> an error occured when executing testQuery, rollbacked`
          );
          queryBuilderTrx.rollback && queryBuilderTrx.rollback();
          reject(err);
        });
      return;
    }).catch(err => {
      return;
    });
  });
};

const releaseQuery = (
  queryName,
  dbName,
  originalQueryTemplate,
  releaseParams = {}
) => {
  if (queryName) {
    const db = databases.getDatabase(dbName);
    return db
      .select('*')
      .from('query_face_templates')
      .where('name', queryName)
      .orderBy('version', 'desc')
      .first()
      .then(qft => {
        if (qft && qft.query === originalQueryTemplate) {
          queryFaceError(ERROR_CODE.RELEASE_FALIED);
        }
        if (qft) {
          return db
            .returning('*')
            .insert({
              name: qft.name,
              query: originalQueryTemplate,
              version: ++qft.version,
              groupId: qft.groupId,
            })
            .into('query_face_templates')
            .then(result => result);
        } else {
          return db
            .returning('*')
            .insert({
              name: queryName,
              query: originalQueryTemplate,
              groupId: releaseParams.groupId,
            })
            .into('query_face_templates')
            .then(result => result);
        }
      });
  }
};

module.exports = execQueries;
module.exports.releaseQuery = releaseQuery;
module.exports.testQuery = testQuery;
