const paramRegex = /\$\{([_a-zA-Z\s]+)\}/;
const paramPrefixMap = {
  QF_CONST: 'qfc',
};
module.exports = {
  paramRegex,
  paramPrefixMap,
};
