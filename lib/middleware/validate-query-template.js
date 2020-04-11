'use strict';
const databases = require('../databases');
const {
  paramRegex,
  paramPrefixMap,
  whitelistRoutes,
} = require('../common/constants');
const {
  specialParamCalculatorMap,
  isString,
  isEqualStringArrays,
  isDevMode,
  isArrayAll,
  isObjectAll,
} = require('../utils/helpers');
const { queryFaceError, ERROR_CODE } = require('../utils/errors');
const QueryFaceResponse = require('../models/query-face-response');
const logger = require('../utils/logger');

const clearParamPrefix = (queryParamValue, templateParamValue) => {
  const prefix = paramPrefixMap.QF_CONST;
  const cleanTemplateParam = templateParamValue.replace(`${prefix}~~`, '');
  const cleanQueryParamValue = queryParamValue.replace(`${prefix}~~`, '');

  if (cleanQueryParamValue !== cleanTemplateParam) {
    queryFaceError(ERROR_CODE.NOT_MATCH);
  }
  return cleanTemplateParam;
};

const getValidParam = (
  queryParamValue,
  templateParamValue,
  params = {},
  req
) => {
  let validParamValue = templateParamValue;
  if (typeof templateParamValue !== typeof queryParamValue) {
    queryFaceError(ERROR_CODE.NOT_MATCH);
  }
  if (isString(templateParamValue)) {
    validParamValue = clearParamPrefix(queryParamValue, templateParamValue);
    if (specialParamCalculatorMap[validParamValue]) {
      validParamValue = specialParamCalculatorMap[validParamValue](req);
    } else {
      const match = validParamValue.match(paramRegex) || [];
      if (match[1]) {
        if (!(match[1] in params)) {
          queryFaceError(ERROR_CODE.MUST_BE_SUPPLIED, match[1]);
        }
        if (match[0].length < validParamValue.length) {
          validParamValue = validParamValue.replace(match[0], params[match[1]]);
        } else {
          validParamValue = params[match[1]];
        }
      }
    }
  } else if (
    isObjectAll(validParamValue, queryParamValue) ||
    isArrayAll(validParamValue, queryParamValue)
  ) {
    const queryParamObjectKeys = Object.keys(queryParamValue);
    const validParamObjectKeys = Object.keys(validParamValue);
    if (!isEqualStringArrays(queryParamObjectKeys, validParamObjectKeys)) {
      queryFaceError(ERROR_CODE.NOT_MATCH);
    }
    validParamObjectKeys.forEach(key => {
      validParamValue[key] = getValidParam(
        queryParamValue[key],
        validParamValue[key],
        params,
        req
      );
    });
  } else {
    validParamValue = queryParamValue;
  }
  return validParamValue;
};

const getValidQuery = (
  query = [],
  queryTemplate = [],
  params,
  req,
  isInnerQuery = false
) => {
  // if this is inner query it doesn't matter what query/(or template) is.
  // so developer must be careful to create secure queries.
  // suggested usage is to append latest .andWhere('userId', '<<currentUserId>>')
  // to keep query secure.
  const validQuery = [...(isInnerQuery ? query : queryTemplate)];
  if (isArrayAll(query, validQuery)) {
    if (query.length === validQuery.length) {
      for (let i = 0; i < validQuery.length; i++) {
        const currentValidQuery = validQuery[i];
        const currentQuery = query[i] || { ...currentValidQuery };
        const isOpAndParamsEqual =
          currentQuery.$op === currentValidQuery.$op &&
          currentQuery.$params.length === currentValidQuery.$params.length;

        if (!isOpAndParamsEqual) {
          queryFaceError(ERROR_CODE.NOT_MATCH);
        }

        if (currentValidQuery.$callback) {
          validQuery[i].$callback = getValidQuery(
            ...[currentQuery.$callback],
            ...[currentValidQuery.$callback],
            params,
            req,
            true
          );
        }

        currentValidQuery.$params = currentValidQuery.$params.map((value, i) =>
          getValidParam(currentQuery.$params[i], value, params, req)
        );
      }
    }
  } else {
    queryFaceError(ERROR_CODE.NOT_MATCH);
  }
  return validQuery;
};

const getQueryTemplateRecord = async (dbName = '', queryName = '') => {
  logger.info(
    `> trying to get query tempate from db: [${dbName}] for queryName: [${queryName}]`
  );
  const queryNameParts = queryName.split('.');
  const db = databases.getDatabase(dbName);

  logger.info(`> starting to generate query for queryName: [${queryName}]`);
  const dbQuery = db
    .select('*')
    .from('query_face_templates')
    .where('name', queryNameParts[0] || '');
  if (queryNameParts[1]) {
    const version = +queryNameParts[1].replace('v', '');
    if (typeof version === 'number' && !isNaN(version)) {
      dbQuery.andWhere('version', version);
    }
  }
  dbQuery.orderBy('version', 'desc');
  dbQuery.first();
  const queryTemplate = await dbQuery;

  logger.debug(`> query result is: %o`, queryTemplate);
  return queryTemplate;
};

const isRequestedUrlInWhitelist = url => {
  return whitelistRoutes.some(whiteUrl =>
    new RegExp(`^\/?qf\/${whiteUrl}\/?$`).test(url)
  );
};

const validateQueryTemplate = async (req, res, next) => {
  logger.info(`> validateQueryTemplate start`);
  const { queries = [] } = req.body;
  try {
    await Promise.all(
      queries.map(async currentQuery => {
        let isWhiteUrl = false;
        const { query, queryName, dbName, params } = currentQuery;
        let queryTemplateRecord = await getQueryTemplateRecord(
          dbName,
          queryName
        );

        if (isDevMode(req.user)) {
          logger.warn(`> development mode is active`);

          isWhiteUrl = isRequestedUrlInWhitelist(req.url);

          if (query.length > 0) {
            queryTemplateRecord = { query: JSON.stringify(query) };
            logger.warn(
              `> queryTemplateRecord is assigned to query from request`
            );
          }
        }

        if (queryTemplateRecord) {
          currentQuery.originalQueryTemplate = queryTemplateRecord.query;
          const queryTemplate = JSON.parse(queryTemplateRecord.query);

          logger.info(`> query validation process is started`);
          const queryFallback = query.length > 0 ? query : queryTemplate;
          currentQuery.query = getValidQuery(
            queryFallback,
            queryTemplate,
            params,
            req
          );
          logger.debug('> validated query: %o', currentQuery.query);

          return queryTemplateRecord;
        } else if (!isWhiteUrl) {
          queryFaceError(ERROR_CODE.NOT_FOUND, 'queryName', queryName);
        }
      })
    );
    next();
  } catch (err) {
    logger.error(`> an error occured: %o`, err);
    res.status(400).send(
      QueryFaceResponse({
        errors: [
          {
            error: true,
            message: err.message,
            ...(isDevMode() ? { stack: err.stack } : {}),
          },
        ],
      })
    );
  }
};

module.exports = validateQueryTemplate;
