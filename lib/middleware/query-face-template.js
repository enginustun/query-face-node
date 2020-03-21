'use strict';
const databases = require('../databases');
const {
  specialParamCalculatorMap,
  isString,
  isObject,
  isEqualStringArrays,
} = require('../utils/helpers');
const QueryFaceResponse = require('../models/query-face-response');

const paramPrefixMap = {
  qfc: true,
};
const paramRegex = /\$\{([_a-zA-Z\s]+)\}/;

const getOrFailParams = (queryParamValue, templateParamValue, params, req) => {
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
          if (match[1] && params[match[1]]) {
            templateParamValue = params[match[1]];
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
          if (value) {
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
          if (value) {
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
    if (isInnerQuery) {
      queryTemplate.splice(0, queryTemplate.length);
      query.forEach(q => queryTemplate.push(q));
    }
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
              currentQuery.$callback,
              currentTemplate.$callback,
              params,
              req,
              true
            ));

        for (let j = 0; j < currentTemplate.$params.length; j++) {
          const paramsResult = getOrFailParams(
            currentQuery.$params[j],
            currentTemplate.$params[j],
            params,
            req
          );
          result = result && paramsResult.result;
          if (!result) {
            break;
          }
          currentTemplate.$params[j] = paramsResult.value;
        }
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
  const { queries = [] } = req.body;
  Promise.all(
    queries.map(currentQuery => {
      const { query, queryName, dbName, params } = currentQuery;
      const db = databases.getDatabase(dbName);
      return db
        .select('*')
        .from('query_face_templates')
        .where('name', queryName || '')
        .first()
        .then(queryTemplateRecord => {
          if (process.env.NODE_ENV === 'development') {
            currentQuery.queryTemplate = query;
            if (query.length > 0) {
              queryTemplateRecord = { query: JSON.stringify(query) };
            }
            currentQuery.originalQueryTemplate = queryTemplateRecord.query;
          }
          if (queryTemplateRecord) {
            try {
              const queryTemplate = JSON.parse(queryTemplateRecord.query);
              const isValid = isValidQuery(query, queryTemplate, params, req);
              if (!isValid) {
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
  ).then(results => {
    const errors = results.filter(r => r.error);
    if (errors.length) {
      res.status(400).send(
        new QueryFaceResponse({
          errors,
        }).toResponse()
      );
    } else {
      next();
    }
  });
};

module.exports = checkQueryTemplate;
