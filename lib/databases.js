const databaseMap = {};

module.exports = {
  getDatabase: dbName => databaseMap[dbName],
  setDatabase: (dbName, knexDB) => {
    databaseMap[dbName] = knexDB;
  },
};
