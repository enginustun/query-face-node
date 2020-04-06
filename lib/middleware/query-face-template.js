'use strict';
const databases = require('../databases');
const {
  specialParamCalculatorMap,
  isString,
  isObject,
  isEqualStringArrays,
} = require('../utils/helpers');
const QueryFaceResponse = require('../models/query-face-response');
const logger = require('../utils/logger');

const paramPrefixMap = {
  qfc: true,
};
const paramRegex = /\$\{([_a-zA-Z\s]+)\}/;

const getOrFailParams = (
  queryParamValue,
  templateParamValue,
  params = {},
  req
) => {
  let result = true;
  if (typeof templateParamValue !== typeof queryParamValue) {
    result = false;
  } else {
    if (isString(templateParamValue)) {
      const prefix = templateParamValue.split('~~')[0];
      if (paramPrefixMap[prefix]) {
        templateParamValue = templateParamValue.replace(`${prefix}~~`, '');
        queryParamValue = queryParamValue.replace(`${prefix}~~`, '');
        if (specialParamCalculatorMap[templateParamValue]) {
          templateParamValue = specialParamCalculatorMap[templateParamValue](
            req
          );
        } else if (queryParamValue !== templateParamValue) {
          result = false;
        }
      } else {
        if (specialParamCalculatorMap[templateParamValue]) {
          templateParamValue = specialParamCalculatorMap[templateParamValue](
            req
          );
        } else {
          // check parameter syntax
          const match = templateParamValue.match(paramRegex) || [];
          if (match[1]) {
            if (!(match[1] in params)) {
              throw Error(`Parameter [${match[1]}] must be supplied`);
            }
            if (match[0].length < templateParamValue.length) {
              templateParamValue = templateParamValue.replace(
                match[0],
                params[match[1]]
              );
            } else {
              templateParamValue = params[match[1]];
            }
          } else {
            templateParamValue = queryParamValue;
          }
        }
      }
    } else {
      if (isObject(templateParamValue)) {
        const queryParamObjectKeys = Object.keys(queryParamValue);
        const templateParamObjectKeys = Object.keys(templateParamValue);
        if (
          !isObject(queryParamValue) ||
          !isEqualStringArrays(queryParamObjectKeys, templateParamObjectKeys)
        ) {
          result = false;
        }
        for (const entries of Object.entries(templateParamValue)) {
          const [key] = entries;
          const { value, result: rs } = getOrFailParams(
            queryParamValue[key],
            templateParamValue[key],
            params,
            req
          );
          if (!rs) {
            result = false;
            break;
          }
          if (value !== undefined) {
            templateParamValue[key] = value;
          }
        }
      } else if (Array.isArray(templateParamValue)) {
        for (let i = 0; i < templateParamValue.length; i++) {
          const { value, result: rs } = getOrFailParams(
            queryParamValue[i],
            templateParamValue[i],
            params,
            req
          );
          if (!rs) {
            result = false;
            break;
          }
          if (value !== undefined) {
            templateParamValue[i] = value;
          }
        }
      } else {
        templateParamValue = queryParamValue;
      }
    }
  }
  return { result, value: templateParamValue };
};

const isValidQuery = (
  query,
  queryTemplate,
  params,
  req,
  isInnerQuery = false
) => {
  let result = true;
  if (Array.isArray(query) && Array.isArray(queryTemplate)) {
    // INFO: if it is inner query, queryTemplate is not important
    logger.debug(
      `> query validation will be checked for: %o <-> %o`,
      query,
      queryTemplate
    );
    if (isInnerQuery) {
      queryTemplate.splice(0, queryTemplate.length);
      query.forEach(q => queryTemplate.push(q));
    }
    logger.info(
      `> isInnerQuery: ${isInnerQuery}, query.lenth: ${query.length}`
    );
    if (
      isInnerQuery ||
      query.length === queryTemplate.length ||
      params ||
      query.length === 0
    ) {
      for (let i = 0; i < queryTemplate.length; i++) {
        const currentTemplate = queryTemplate[i];
        const currentQuery = query[i] || { ...currentTemplate };
        result =
          result &&
          currentQuery.$op === currentTemplate.$op &&
          (isInnerQuery ||
            currentQuery.$params.length === currentTemplate.$params.length) &&
          (!currentTemplate.$callback ||
            isValidQuery(
              [...currentQuery.$callback],
              currentTemplate.$callback,
              params,
              req,
              true
            ));

        logger.info(`> Parameter parsing is started`);
        for (let j = 0; j < currentTemplate.$params.length; j++) {
          const paramsResult = getOrFailParams(
            currentQuery.$params[j],
            currentTemplate.$params[j],
            params,
            req
          );
          result = result && paramsResult.result;
          if (!result) {
            logger.warn(`> Parameter parsing is unsuccessfully finished`);
            break;
          }
          currentTemplate.$params[j] = paramsResult.value;
        }
        logger.info(`> Parameter parsing is successfully finished`);
      }
    } else {
      result = false;
    }
  } else {
    result = false;
  }
  return result;
};

const checkQueryTemplate = async (req, res, next) => {
  logger.info(`> checkQueryTemplate start`);
  const { queries = [] } = req.body;
  Promise.all(
    queries.map(currentQuery => {
      const { query, queryName = '', dbName, params } = currentQuery;
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

      logger.info(
        `> trying to get query tempate from db: [${dbName}] for queryName: [${queryName}]`
      );
      return dbQuery
        .then(queryTemplateRecord => {
          logger.debug(`> query result is: %o`, queryTemplateRecord);
          if (
            process.env.NODE_ENV === 'development' ||
            (req.user && req.user.isDeveloper)
          ) {
            logger.warn(`> development mode is active`);
            if (query.length > 0) {
              queryTemplateRecord = { query: JSON.stringify(query) };
              logger.warn(
                `> queryTemplateRecord is assigned to query from request`
              );
            }
          }
          if (queryTemplateRecord) {
            logger.info(`> queryTemplateRecord is exists`);
            currentQuery.originalQueryTemplate = queryTemplateRecord.query;
            try {
              logger.debug(`> parsing template record into object`);
              const queryTemplate = JSON.parse(queryTemplateRecord.query);

              logger.info(`> query validation process is started`);
              const isValid = isValidQuery(
                query.length > 0 ? query : queryTemplate,
                queryTemplate,
                params,
                req
              );
              logger.info(
                `> validation result is [${isValid ? 'valid' : 'invalid'}]`
              );
              if (!isValid) {
                logger.warn(`> no chance to execute this invalid query.`);
                return {
                  error: true,
                  message:
                    'Your query and query template in server does not match',
                };
              } else {
                currentQuery.query = queryTemplate;
              }
            } catch (err) {
              return { error: true, message: err.toString() };
            }
          } else {
            return {
              error: true,
              message: `queryName: [${queryName}]: query cannot found`,
            };
          }
          return queryTemplateRecord;
        })
        .catch(err => ({ error: true, message: err.toString() }));
    })
  )
    .then(results => {
      const errors = results.filter(r => r.error);
      if (errors.length) {
        logger.error(`> some errors occured: %o`, errors);
        res.status(400).send(QueryFaceResponse({ errors }));
      } else {
        next();
        return Promise.resolve(true);
      }
    })
    .catch(err => {
      logger.error(`> an error occured: %o`, err);
      res.status(400).send(QueryFaceResponse({ errors: [err] }));
    });
};

module.exports = checkQueryTemplate;
