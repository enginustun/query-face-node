module.exports = (databases = {}) =>
  Promise.all(
    Object.entries(databases).map(entry => {
      const [dbName, db] = entry;
      return (
        !db.disableSeeds &&
        db.seed
          .run()
          .then(function() {
            console.log('seeds are executed for', dbName);
          })
          .catch(err => console.log('seeds cannot executed for', dbName, err))
      );
    })
  ).then(() => {
    process.exit();
  });
