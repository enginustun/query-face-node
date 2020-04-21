const { testQuery, releaseQuery, getTables } = require('../routes');
const queryFace = require('./query-face');
const validateQueryFaceTemplate = require('../middleware/validate-query-template');
const { isRequestedUrlAnonymous } = require('../utils/helpers');

module.exports = [
  validateQueryFaceTemplate,
  async function(req, res, next) {
    const url = req.url.toLowerCase();
    const { user = {} } = req;
    const isDev = process.env.NODE_ENV === 'development' || user.isDeveloper;
    const isAnonymousUrl = isRequestedUrlAnonymous(url);
    if (/^\/?qf\/?$/.test(url)) {
      queryFace(req, res, next);
    } else if (!isDev && !isAnonymousUrl) {
      res.status(404).send();
    } else if (/^\/?qf\/get-tables\/?$/.test(url)) {
      getTables(req, res, next);
    } else if (/^\/?qf\/test-query\/?$/.test(url)) {
      testQuery(req, res, next);
    } else if (/^\/?qf\/release-query\/?$/.test(url)) {
      releaseQuery(req, res, next);
    } else {
      res.status(404).send();
    }
  },
];
