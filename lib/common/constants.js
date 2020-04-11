const aliasRegex = /\{\{([a-zA-Z_$][0-9a-zA-Z_$]*)\.([a-zA-Z_$][0-9a-zA-Z_$]*)\}\}/;
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

module.exports = {
  aliasRegexG,
  aliasRegex,
  paramRegex,
  paramPrefixMap,
  queryMap,
  whitelistRoutes,
};
