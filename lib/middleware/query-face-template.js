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

const getOrFailParams = (queryParamValue, templateParamValue, req) => {
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
          templateParamValue = queryParamValue;
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
      } else {
        templateParamValue = queryParamValue;
      }
    }
  }

  return { result, value: templateParamValue };
};

const getOrFailValidQuery = (
  query,
  queryTemplate,
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
    if (isInnerQuery || query.length === queryTemplate.length) {
      for (let i = 0; i < queryTemplate.length; i++) {
        const currentTemplate = queryTemplate[i];
        const currentQuery = query[i];
        result =
          result &&
          currentQuery.$op === currentTemplate.$op &&
          (isInnerQuery ||
            currentQuery.$params.length === currentTemplate.$params.length) &&
          (!currentTemplate.$callback ||
            getOrFailValidQuery(
              currentQuery.$callback,
              currentTemplate.$callback,
              req,
              true
            ));

        for (let j = 0; j < currentTemplate.$params.length; j++) {
          const paramsResult = getOrFailParams(
            currentQuery.$params[j],
            currentTemplate.$params[j],
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
      const { query, queryName, dbName } = currentQuery;
      const db = databases.getDatabase(dbName);
      return db
        .select('*')
        .from('query_face_templates')
        .where('name', queryName || '')
        .first()
        .then(queryTemplateRecord => {
          if (process.env.NODE_ENV === 'development') {
            currentQuery.queryTemplate = query;
            queryTemplateRecord = { query: JSON.stringify(query) };
          }
          if (queryTemplateRecord) {
            try {
              const queryTemplate = JSON.parse(queryTemplateRecord.query);
              const result = getOrFailValidQuery(query, queryTemplate, req);
              if (!result) {
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
