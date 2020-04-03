const { testQuery, releaseQuery, getTables } = require('../routes');
module.exports = async function(req, res, next) {
  const { user = {} } = req;
  const isDev = process.env.NODE_ENV === 'development' || user.isDeveloper;
  if (/^\/?qf\/?$/.test(req.url)) {
    next();
  } else if (!isDev) {
    res.status(404).send();
  } else if (/^\/?qf\/get-tables\/?$/.test(req.url)) {
    getTables(req, res, next);
  } else if (/^\/?qf\/test-query\/?$/.test(req.url)) {
    testQuery(req, res, next);
  } else if (/^\/?qf\/release-query\/?$/.test(req.url)) {
    releaseQuery(req, res, next);
  } else {
    res.status(404).send();
  }
};