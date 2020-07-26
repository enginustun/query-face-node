const { whitelistRoutes, anonymousRoutes } = require('../common/constants');

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
const isObject = val =>
  Object.prototype.toString.call(val) === '[object Object]';

const isFunction = val =>
  Object.prototype.toString.call(val) === '[object Function]';

const isRequestedUrlInWhitelist = (url = '') => {
  return whitelistRoutes.some((whiteUrl = '') =>
    new RegExp(`^\/?qf\/${whiteUrl.toLowerCase()}\/?$`).test(url.toLowerCase())
  );
};

const isRequestedUrlAnonymous = url => {
  return anonymousRoutes.some(anonymousUrl =>
    new RegExp(`^\/?qf\/${anonymousUrl}\/?$`).test(url)
  );
};

module.exports = {
  getTokenFromRequest,

  runGenerator,

  isObject,

  isFunction,

  isRequestedUrlInWhitelist,

  isRequestedUrlAnonymous,

  uuid: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

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

  isString: val => typeof val === 'string',

  isObjectAll: (...objs) =>
    objs.map(isObject).reduce((accm, current) => accm && current, true),

  isArrayAll: (...arrs) =>
    arrs.map(Array.isArray).reduce((accm, current) => accm && current, true),

  isDevUser: (user = {}) => user.isDeveloper,

  isDevMode: () => process.env.NODE_ENV === 'development',

  isNullOrUndefined: val => val == undefined,
};
