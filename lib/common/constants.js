const MAIN_DB_NAME = 'qfdb';
const aliasRegex = /\{\{([a-zA-Z_$][0-9a-zA-Z_$]*)\.([a-zA-Z_$][0-9a-zA-Z_$]*)(:(.*))?\}\}/;
const aliasRegexG = new RegExp(aliasRegex, 'g');
const paramRegex = /\$\{([_a-zA-Z\s]+)\}/;
const paramPrefixMap = {
  QF_CONST: 'qfc',
};
const queryMap = {
  delete: 'from',
  update: 'from',
  set: 'update',
};

const whitelistRoutes = ['get-tables'];
const anonymousRoutes = ['test-query'];

module.exports = {
  MAIN_DB_NAME,
  aliasRegexG,
  aliasRegex,
  anonymousRoutes,
  paramRegex,
  paramPrefixMap,
  queryMap,
  whitelistRoutes,
};
