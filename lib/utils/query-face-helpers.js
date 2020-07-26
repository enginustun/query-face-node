const QueryFaceResponse = require('../models/query-face-response');
const beforeEvents = require('../query-events/before')();
const afterEvents = require('../query-events/after')();
const { queryMap, aliasRegex, aliasRegexG } = require('../common/constants');
const {
  isString,
  isObject,
  isFunction,
  isNullOrUndefined,
} = require('../utils/helpers');

const executeBeforeEvent = (currentQuery, req, res) => {
  const { queryName } = currentQuery;
  if (isFunction(beforeEvents[queryName])) {
    const result = beforeEvents[queryName](req, res, currentQuery);
    if (result === false || isObject(result)) {
      const {
        status = 400,
        error = `${queryName} query is blocked by before event.`,
        ...rest
      } = result || {};
      res.status(status).send(
        QueryFaceResponse({
          errors: [{ message: error, ...rest }],
        })
      );
      return false;
    }
  }
};

const executeBeforeEvents = (queries, req, res) => {
  try {
    for (let i = 0; i < queries.length; i++) {
      const currentQuery = queries[i];
      return executeBeforeEvent(currentQuery, req, res);
    }
  } catch (error) {
    res.status(500).send(
      QueryFaceResponse({
        errors: [{ message: error.message }],
      })
    );
    return false;
  }
};

const executeAfterEvent = async (queryName, req, res) => {
  if (isFunction(afterEvents[queryName])) {
    afterEvents[queryName](
      req,
      res,
      currentQuery.queryResult,
      currentQuery.queryError
    );
  }
};

const executeAfterEvents = async (queries, req, res) => {
  queries.forEach(currentQuery => {
    const { queryName } = currentQuery;
    executeAfterEvent(queryName, req, res);
  });
};

const parseDependentParams = (param, responseAliasMap) => {
  if (isString(param)) {
    const matches = param.match(aliasRegexG);
    if (Array.isArray(matches)) {
      matches.forEach(subParam => {
        const match = subParam.match(aliasRegex);
        if (match) {
          const responseAlias = match[1];
          const responseAliasKey = match[2];
          const responseAliasDefaultValue = +match[4] || match[4];
          const {
            [responseAlias]: {
              [responseAliasKey]: response = responseAliasDefaultValue,
            } = {},
          } = responseAliasMap;
          param =
            param === subParam ? response : param.replace(subParam, response);
        }
      });
      return isNullOrUndefined(param) ? '' : param;
    }
  } else if (isObject(param)) {
    Object.entries(param).forEach(([key, value]) => {
      param[key] = parseDependentParams(value, responseAliasMap);
      return isNullOrUndefined(param) ? '' : param;
    });
  }
  return isNullOrUndefined(param) ? '' : param;
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

const getExecutableQuery = (db, query, responseAliasMap = {}) => {
  if (!Array.isArray(query)) {
    queryFaceError(ERROR_CODE.MUST_BE_ARRAY);
  }
  let executableQuery = db.queryBuilder();
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
      Array.isArray(queryItem.$callback) ? getCallback(queryItem.$callback) : []
    );
    executableQuery = executableQuery[queryMap[queryItem.$op] || queryItem.$op](
      ...params
    );
  });
  if (isDelete) {
    executableQuery = executableQuery.delete();
  }
  return executableQuery;
};

const getExecutionResult = async (executableQuery, currentQuery, req, res) => {
  const { queryName } = currentQuery;
  try {
    const beforeEventResult = executeBeforeEvent(currentQuery, req, res);
    if (beforeEventResult !== false) {
      const queryResult = await executableQuery;
      currentQuery.queryResult = queryResult;
      executeAfterEvent(queryName, req, res);
      return typeof queryResult === 'number'
        ? queryResult.toString()
        : queryResult;
    }
  } catch (err) {
    currentQuery.queryError = err;
    executeAfterEvent(queryName, req, res);
    throw err;
  }
};

module.exports = {
  parseDependentParams,
  getCallback,
  getExecutableQuery,
  getExecutionResult,
  executeBeforeEvents,
  executeAfterEvent,
  executeAfterEvents,
};
