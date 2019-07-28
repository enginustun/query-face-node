const databases = require('../databases');
const getUniqueCountBy = require('../utils/helpers').getUniqueCountBy;
const runGenerator = require('../utils/helpers').runGenerator;
const isString = require('../utils/helpers').isString;
const isObject = require('../utils/helpers').isObject;
const executeAfterEvents = require('../utils/helpers').executeAfterEvents;
const QueryFaceResponse = require('../models/query-face-response');

const queryMap = {
  delete: 'from',
  update: 'from',
  set: 'update',
};

const aliasRegexG = /\{\{([a-zA-Z_$][0-9a-zA-Z_$]*)\.([a-zA-Z_$][0-9a-zA-Z_$]*)\}\}/g;
const aliasRegex = /\{\{([a-zA-Z_$][0-9a-zA-Z_$]*)\.([a-zA-Z_$][0-9a-zA-Z_$]*)\}\}/;

const parseDependentParams = (param, responseAliasMap) => {
  if (isString(param)) {
    const matches = param.match(aliasRegexG);
    if (Array.isArray(matches)) {
      matches.forEach(subParam => {
        const match = subParam.match(aliasRegex);
        if (match) {
          const responseAlias = match[1];
          const responseAliasKey = match[2];
          const {
            [responseAlias]: { [responseAliasKey]: response } = {},
          } = responseAliasMap;
          param =
            param === subParam ? response : param.replace(subParam, response);
        }
      });
      return param;
    }
  } else if (isObject(param)) {
    Object.entries(param).forEach(([key, value]) => {
      param[key] = parseDependentParams(value, responseAliasMap);
      return param;
    });
  }
  return param;
};

const getCallback = (inner, responseAliasMap) =>
  function() {
    let qb = this;
    inner.forEach(q => {
      let params = q.$params || [];
      if (responseAliasMap && Object.keys(responseAliasMap).length) {
        params = params.map(param =>
          parseDependentParams(param, responseAliasMap)
        );
      }
      params = params.concat(
        Array.isArray(q.$callback)
          ? getCallback(q.$callback, responseAliasMap)
          : []
      );
      qb = qb[queryMap[q.$op] || q.$op](...params);
    });
  };

const executeQueryWithTransaction = async (req, res) => {
  const { queries = [] } = req.body;
  const uniqueDbNameCount = getUniqueCountBy(queries, 'dbName');
  let trxName;
  if (queries.length > 1 && uniqueDbNameCount !== 1) {
    throw new Error(
      'all db names must be same if you want to run all queries within transaction'
    );
  }
  trxName = queries[0].dbName;
  let db = databases.getDatabase(trxName);
  if (!db) {
    throw new Error(
      `dbName or trxName: [${trxName}] you provide cannot be found`
    );
  }

  db.transaction(queryBuilderTrx => {
    Promise.all(
      queries.map(currentQuery => {
        let executableQuery = db.queryBuilder();
        const { query, queryName, queryTemplate } = currentQuery;
        if (!Array.isArray(query)) {
          throw new Error('query must be an array');
        }
        let isDelete = false;
        query.forEach(queryItem => {
          if (queryItem.$op === 'delete') {
            isDelete = true;
          }
          let params = queryItem.$params || [];
          params = params.concat(
            Array.isArray(queryItem.$callback)
              ? getCallback(queryItem.$callback)
              : []
          );
          executableQuery = executableQuery[
            queryMap[queryItem.$op] || queryItem.$op
          ](...params);
        });
        if (isDelete) {
          executableQuery = executableQuery.delete();
        }
        executableQuery.transacting(queryBuilderTrx);
        return executableQuery
          .then(queryResult => {
            if (process.env.NODE_ENV === 'development') {
              if (queryName) {
                executableQuery = databases.getDatabase(trxName);
                executableQuery
                  .select('*')
                  .from('query_face_templates')
                  .where('name', queryName)
                  .first()
                  .then(qft => {
                    if (qft) {
                      executableQuery
                        .update({ query: JSON.stringify(queryTemplate) })
                        .from('query_face_templates')
                        .where('name', queryName)
                        .then(result => result);
                    } else {
                      executableQuery
                        .insert({
                          name: queryName,
                          query: JSON.stringify(queryTemplate),
                        })
                        .into('query_face_templates')
                        .then(result => result);
                    }
                  });
              }
            }
            currentQuery.queryResult = queryResult;
            return typeof queryResult === 'number'
              ? queryResult.toString()
              : queryResult;
          })
          .catch(err => {
            currentQuery.queryError = err;
            throw new Error(err);
          });
      })
    )
      .then(results => {
        queryBuilderTrx.commit && queryBuilderTrx.commit();
        executeAfterEvents(queries);
        res.status(200).send(
          new QueryFaceResponse({
            results,
          }).toResponse()
        );
      })
      .catch(err => {
        queryBuilderTrx.rollback && queryBuilderTrx.rollback();
        res.status(400).send(
          new QueryFaceResponse({
            errors: [{ message: err.toString(), trxName }],
          }).toResponse()
        );
      });
  }).catch(err => {
    return err;
  });
};

const executeQueryWithDependency = function*(req, res) {
  const { queries = [] } = req.body;
  const uniqueDbNameCount = getUniqueCountBy(queries, 'dbName');
  let trxName;
  if (queries.length > 1 && uniqueDbNameCount !== 1) {
    throw new Error(
      'all db names must be same if you want to run all queries within transaction'
    );
  }
  trxName = queries[0].dbName;
  let db = databases.getDatabase(trxName);
  if (!db) {
    throw new Error(
      `dbName or trxName: [${trxName}] you provide cannot be found`
    );
  }
  let results = [];
  const responseAliasMap = {};

  const queryBuilderTrx = yield db.transaction();
  for (let i = 0; i < queries.length; i++) {
    const currentQuery = queries[i];
    let executableQuery = db.queryBuilder();
    const { query, queryName, queryTemplate, responseAlias } = currentQuery;
    if (!Array.isArray(query)) {
      throw new Error('query must be an array');
    }

    let isDelete = false;
    query.forEach(queryItem => {
      if (queryItem.$op === 'delete') {
        isDelete = true;
      }
      let params = queryItem.$params || [];
      if (Object.keys(responseAliasMap).length) {
        params = params.map(param =>
          parseDependentParams(param, responseAliasMap)
        );
      }
      params = params.concat(
        Array.isArray(queryItem.$callback)
          ? getCallback(queryItem.$callback, responseAliasMap)
          : []
      );
      executableQuery = executableQuery[
        queryMap[queryItem.$op] || queryItem.$op
      ](...params);
    });
    if (isDelete) {
      executableQuery = executableQuery.delete();
    }

    executableQuery.transacting(queryBuilderTrx);

    const queryResult = yield executableQuery
      .then(queryResult => {
        if (process.env.NODE_ENV === 'development') {
          if (queryName) {
            executableQuery = databases.getDatabase(trxName);
            executableQuery
              .select('*')
              .from('query_face_templates')
              .where('name', queryName)
              .first()
              .then(qft => {
                if (qft) {
                  executableQuery
                    .update({ query: JSON.stringify(queryTemplate) })
                    .from('query_face_templates')
                    .where('name', queryName)
                    .then(result => result);
                } else {
                  executableQuery
                    .insert({
                      name: queryName,
                      query: JSON.stringify(queryTemplate),
                    })
                    .into('query_face_templates')
                    .then(result => result);
                }
              });
          }
        }
        currentQuery.queryResult = queryResult;
        return typeof queryResult === 'number'
          ? queryResult.toString()
          : queryResult;
      })
      .catch(err => {
        currentQuery.queryError = err;
        return { error: true, trxName, message: err.toString() };
      });
    results.push(queryResult);

    if (responseAlias && Array.isArray(queryResult)) {
      responseAliasMap[responseAlias] = queryResult[0];
    }
  }
  const errors = results.filter(r => r.error);
  if (errors.length) {
    queryBuilderTrx.rollback && queryBuilderTrx.rollback();
    res.status(400).send(
      new QueryFaceResponse({
        errors: errors,
      }).toResponse()
    );
  } else {
    queryBuilderTrx.commit && queryBuilderTrx.commit();
    executeAfterEvents(queries);
    res.status(200).send(
      new QueryFaceResponse({
        results,
      }).toResponse()
    );
  }
};

const executeQueryDirectly = (req, res) => {
  const { queries = [] } = req.body;

  Promise.all(
    queries.map(currentQuery => {
      const { query, queryName, queryTemplate, dbName } = currentQuery;
      const db = databases.getDatabase(dbName);
      if (!db) {
        throw new Error(`dbName: [${dbName}] you provide cannot be found`);
      }
      if (!Array.isArray(query)) {
        throw new Error('query must be an array');
      }
      let executableQuery = db.queryBuilder();
      let isDelete = false;
      query.forEach(queryItem => {
        if (queryItem.$op === 'delete') {
          isDelete = true;
        }
        let params = queryItem.$params || [];
        params = params.concat(
          Array.isArray(queryItem.$callback)
            ? getCallback(queryItem.$callback)
            : []
        );
        executableQuery = executableQuery[
          queryMap[queryItem.$op] || queryItem.$op
        ](...params);
      });
      if (isDelete) {
        executableQuery = executableQuery.delete();
      }
      return executableQuery
        .then(queryResult => {
          if (process.env.NODE_ENV === 'development') {
            if (queryName) {
              executableQuery = databases.getDatabase(dbName);
              executableQuery
                .select('*')
                .from('query_face_templates')
                .where('name', queryName)
                .first()
                .then(qft => {
                  if (qft) {
                    executableQuery
                      .update({ query: JSON.stringify(queryTemplate) })
                      .from('query_face_templates')
                      .where('name', queryName)
                      .then(result => result);
                  } else {
                    executableQuery
                      .insert({
                        name: queryName,
                        query: JSON.stringify(queryTemplate),
                      })
                      .into('query_face_templates')
                      .then(result => result);
                  }
                });
            }
          }
          currentQuery.queryResult = queryResult;
          return typeof queryResult === 'number'
            ? queryResult.toString()
            : queryResult;
        })
        .catch(err => {
          currentQuery.queryError = err;
          return { error: true, message: err.toString() };
        });
    })
  )
    .then(results => {
      executeAfterEvents(queries);
      res.status(200).send(
        new QueryFaceResponse({
          results: results.map(r => (!r.error ? r : [])),
          errors: results.filter(r => r.error),
        }).toResponse()
      );
    })
    .catch(err => {
      res.status(400).send(
        new QueryFaceResponse({
          errors: [{ message: err.toString() }],
        }).toResponse()
      );
    });
};

const executeQuery = async (req, res, next) => {
  try {
    const { transaction = false, dependent = false } = req.body;

    if (dependent) {
      runGenerator(executeQueryWithDependency(req, res, next));
    } else if (transaction) {
      executeQueryWithTransaction(req, res, next, transaction);
    } else {
      executeQueryDirectly(req, res, next);
    }
  } catch (err) {
    res.status(400).send(
      new QueryFaceResponse({
        errors: [{ message: err.toString() }],
      }).toResponse()
    );
  }
};

module.exports = executeQuery;