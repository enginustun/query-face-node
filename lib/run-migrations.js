const path = require('path');
module.exports = (databases = {}) =>
  Promise.all(
    Object.entries(databases).map(entry => {
      const [dbName, db] = entry;
      return db.migrate
        .latest({
          tableName: 'queryface_knex_migrations',
          directory: path.join(__dirname, 'migrations'),
        })
        .then(function() {
          console.log('queryface migrations are up to date');
          return db.migrate.latest().then(function() {
            console.log('migrations are up to date for', dbName);
          });
        });
    })
  ).then(() => {
    process.exit();
  });
