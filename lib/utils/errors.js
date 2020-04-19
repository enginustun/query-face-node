const { isDevMode, isFunction } = require('./helpers');
const ERROR_CODE = {
  NOT_MATCH: 0,
  NOT_FOUND: 1,
  MUST_BE_SUPPLIED: 2,
  MUST_ALL_SAME: 3,
  MUST_BE_ARRAY: 4,
  RELEASE_FALIED: 5,
};
const errors = {
  0: 'Your query and query template in server does not match',
  1: (type, name) => `${type}: [${name}] you provide cannot found`,
  2: parameterName => `Parameter [${parameterName}] must be supplied`,
  3: 'all db names must be same if you want to run all queries within transaction',
  4: 'query must be an array',
  5: 'Release failed. Query you are trying to release is the same of latest version.',
};
module.exports = {
  queryFaceError(error, ...args) {
    const e = errors[error];
    const msg = !e
      ? 'unknown error no: ' + error
      : isFunction(e)
      ? e.apply(null, args)
      : e;
    throw new Error(`[query-face] ${msg}`);
  },
  ERROR_CODE,
};
