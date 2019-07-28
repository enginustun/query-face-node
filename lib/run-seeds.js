module.exports = (databases = {}) =>
  Promise.all(
    Object.entries(databases).map(entry => {
      const [dbName, db] = entry;
      return db.seed.run().then(function() {
        console.log('seeds are executed for', dbName);
      });
    })
  ).then(() => {
    process.exit();
  });
