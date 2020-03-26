const { executeQueryDirectly, releaseQuery } = require('./query-face');
module.exports = function(req, res, next) {
  const { user = {} } = req;
  const isDev = process.env.NODE_ENV === 'development' || user.isDeveloper;
  if (/^\/?qf\/?$/.test(req.url)) {
    next();
  } else if (!isDev) {
    res.status(404).send();
  } else if (/^\/?qf\/test-query\/?$/.test(req.url)) {
    executeQueryDirectly(req, res, next);
  } else if (/^\/?qf\/release-query\/?$/.test(req.url)) {
    // TODO: route to release-query here for req.user.isDeveloper = true
    const { queries = [] } = req.body;
    Promise.all(
      queries.map(currentQuery => {
        const { queryName, dbName, originalQueryTemplate } = currentQuery;
        return releaseQuery(queryName, dbName, originalQueryTemplate, user);
      })
    ).then(res => console.log('release-query', res));
    executeQueryDirectly(req, res, next);
  } else {
    res.status(404).send();
  }
};
