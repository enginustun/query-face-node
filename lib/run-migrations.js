module.exports = (databases = {}) =>
  Promise.all(
    Object.entries(databases).map(entry => {
      const [dbName, db] = entry;
      return db.migrate.latest().then(function() {
        console.log('migrations are up to date for', dbName);
      });
    })
  ).then(() => {
    process.exit();
  });
