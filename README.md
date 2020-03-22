# query-face-node &middot; [![Build Status](https://travis-ci.org/enginustun/query-face-node.svg?branch=master)](https://travis-ci.org/enginustun/query-face-node) ![npm](https://img.shields.io/npm/v/query-face-node) ![GitHub](https://img.shields.io/github/license/enginustun/query-face-node)

This is [query-face](https://github.com/enginustun/query-face) parser and executor library for Node.js that enables you to manipulate your data freely without endpoints.

- install library.

  ```
  npm install --save query-face-node
  ```

- setting up your configuration

  You need to define databases (at least one) based on [knex](https://knexjs.org) documentation. We recommend that you use [dotenv](https://github.com/motdotla/dotenv) library to manage your environment variables.

  ```javascript
  //databases.js
  require('dotenv').config();
  module.exports = {
    todoDB: require('knex')({
      client: process.env.DB_CLIENT,
      connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
      migrations: {
        tableName: process.env.DB_MIGRATION_TABLE,
        directory: process.env.DB_MIGRATION_DIRECTORY,
      },
      seeds: {
        directory: process.env.DB_SEEDS_DIRECTORY,
      },
    }),
  };
  ```

  Based on your database client configuration you need to install (at least) one of the following database drivers.

  ```
  npm install pg
  npm install sqlite3
  npm install mysql
  npm install mysql2
  npm install oracle
  npm install mssql
  ```

  Once you configure your databases, you can use queryFaceNode middlewares by setting queryFaceNode databases as follow. Also you need to add queryFaceNode middlewares to specific route you desired.

  ```javascript
  // app.js
  const express = require('express');
  const app = express();
  const queryFaceNode = require('query-face-node');
  const databases = require('./databases');

  queryFaceNode.setDatabase('todoDB', databases.todoDB);

  app.use(express.json());
  app.post('/api', ...queryFaceNode);
  ```

  You can manage your migration and seed files by using knex CLI or API.

  - For [migrations-CLI](https://knexjs.org/#Migrations-CLI)
  - For [seeds-CLI](https://knexjs.org/#Seeds-CLI)
  - For [migrations-API](https://knexjs.org/#Migrations-API)
  - For [seeds-API](https://knexjs.org/#Seeds-API)

## Documentation

  - [x] [API documentation](https://enginustun.github.io/query-face-node/)
  - [ ] Tutorials (not started)
