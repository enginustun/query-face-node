const { isDevMode, isFunction } = require('./helpers');
const errors = {
  0: 'Your query and query template in server does not match',
  1: queryName => `queryName: [${queryName}] query cannot found`,
  2: parameterName => `Parameter [${parameterName}] must be supplied`,
};
module.exports = {
  queryFaceError(error, ...args) {
    if (isDevMode()) {
      const e = errors[error];
      const msg = !e
        ? 'unknown error no: ' + error
        : isFunction(e)
        ? e.apply(null, args)
        : e;
      throw new Error(`[query-face] ${msg}`);
    }
    throw new Error(
      `[query-face] Error no: ${error}${
        args.length ? ' ' + args.join(',') : ''
      }`
    );
  },
};
