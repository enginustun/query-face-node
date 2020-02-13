const beforeEvents = require('../query-events/before')();
const afterEvents = require('../query-events/after')();

const getTokenFromRequest = req => {
  return (req.header('Authorization') || '').split(' ')[1];
};

const isPromise = obj => Boolean(obj) && typeof obj.then === 'function';

const runGenerator = (iterator, prevValue) => {
  const result = iterator.next(prevValue);
  if (!result.done) {
    if (isPromise(result.value)) {
      result.value.then(res => runGenerator(iterator, res));
    } else {
      runGenerator(iterator, result.value);
    }
  }
};

const isFunction = val =>
  Object.prototype.toString.call(val) === '[object Function]';

module.exports = {
  uuid: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  getTokenFromRequest,

  specialParamCalculatorMap: {
    '<<currentUserId>>': req => {
      if (req.user && req.user.id) {
        return req.user.id;
      }
      throw new Error(
        'There is no user information in request. So <<currentUserId>> special parameter cannot be used. Be sure that you do authenticate first, check your token.'
      );
    },
  },

  getUniqueCountBy: (arr = [], name) => {
    const map = {};
    arr.reduce((accm, item) => {
      accm[item[name]] = true;
      return accm;
    }, map);
    const uniqueArr = Object.keys(map);
    return uniqueArr.length;
  },

  isEqualStringArrays: (arr1 = [], arr2 = []) => {
    let isEqual = true;
    if (arr1.length !== arr2.length) {
      isEqual = false;
    } else {
      for (var i = 0; i < arr1.length; i++) {
        if (!arr2.includes(arr1[i])) {
          isEqual = false;
          break;
        }
      }
    }
    return isEqual;
  },

  runGenerator,

  isString: val => typeof val === 'string',

  isObject: val => Object.prototype.toString.call(val) === '[object Object]',

  isFunction,

  executeBeforeEvents: async (queries, req, res) => {
    req.beforeEventResults = {};
    queries.forEach(currentQuery => {
      const { queryName } = currentQuery;
      if (isFunction(beforeEvents[queryName])) {
        req.beforeEventResults[queryName] = beforeEvents[queryName](
          req,
          res,
          currentQuery
        );
      }
    });
  },

  executeAfterEvents: async (queries, req, res) => {
    queries.forEach(currentQuery => {
      const { queryName } = currentQuery;
      if (isFunction(afterEvents[queryName])) {
        afterEvents[queryName](
          req,
          res,
          currentQuery.queryResult,
          currentQuery.queryError
        );
      }
    });
  },
};
