const path = require('path');
const databaseMap = {};
const setDatabase = (dbName, knexDB) => {
  databaseMap[dbName] = knexDB;
};
const setMainDatabase = knexDB => {
  databaseMap.qfdb = knexDB;
};
// try to parse consumer's databases file
try {
  const databases = require(path.join(process.cwd(), 'src', 'databases.js'));
  if (databases) {
    Object.entries(databases).forEach(([name, db]) => {
      if (name && db) {
        if (name === 'qfdb') {
          setMainDatabase(db);
          console.log(`[qfdb] MAIN database is set automatically`);
        } else {
          setDatabase(name, db);
          console.log(`[${name}] database is set automatically`);
        }
      }
    });
  }
} catch (error) {}

module.exports = {
  getDatabase: dbName => databaseMap[dbName],
  setDatabase,
  setMainDatabase,
};
