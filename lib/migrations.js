const path = require('path');
const runMigrations = (databases = {}) =>
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

const listMigrations = (db, config = {}) => {
  return db.migrate.list(config);
};
const makeMigrations = (db, name, config = {}) => {
  return db.migrate.make(name, config);
};
const latestMigrations = (db, config = {}) => {
  return db.migrate.latest(config);
};
const rollbackMigrations = (db, all = false, config = {}) => {
  return db.migrate.rollback(config, all);
};
const upMigrations = (db, config = {}) => {
  return db.migrate.up(config);
};
const downMigrations = (db, config = {}) => {
  return db.migrate.down(config);
};
const currentVersionMigrations = (db, config = {}) => {
  return db.migrate.currentVersion(config);
};

module.exports = {
  runMigrations,
  listMigrations,
  makeMigrations,
  latestMigrations,
  rollbackMigrations,
  upMigrations,
  downMigrations,
  currentVersionMigrations,
};
