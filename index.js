const checkQueryTemplate = require('./lib/middleware/query-face-template');
const queryFace = require('./lib/middleware/query-face');
const setDatabase = require('./lib/databases').setDatabase;
const runMigrations = require('./lib/run-migrations');
const runSeeds = require('./lib/run-seeds');
const { addEvent: addAfterEvent } = require('./lib/query-events/after');

/**
 * @class queryFaceNode
 *
 * @description
 * <a href="https://github.com/enginustun/query-face-node" target="_blank">query-face-node</a>
 * is a module that enables you to parse and execute
 * <a href="https://github.com/enginustun/query-face" target="_blank">query-face</a> requests.
 *
 * @returns {Array<miidleware>} [checkQueryTemplate, queryFace]
 * @example
 * const express = require('express');
 * const app = express();
 * const queryFaceNode = require('query-face-node');
 * app.post('/api', ...queryFaceNode);
 * // or
 * const [checkQueryTemplate, queryFace] = queryFaceNode;
 * app.post('/api', checkQueryTemplate, queryFace);
 * // or you can insert your custom middlewares anywhere you want before, after or between queryFaceNode middlewares
 * app.post('/api', customMiddleware1, checkQueryTemplate, customMiddleware2, queryFace, customMiddleware3);
 * // for example authenticate before queryFaceNode middlewares
 * app.post('/api', authenticate, ...queryFaceNode);
 */
module.exports = [checkQueryTemplate, queryFace];

/**
 * @memberof queryFaceNode.
 * @function setDatabase
 * @param {string} dbName database name alias
 * @param {knex} database knex database instance you configured to use db operations
 * @example
 * // somewhere in your project
 * // databases.js
 * require('dotenv').config();
 * module.exports = {
 *   todoDB: require('knex')({
 *     client: process.env.DB_CLIENT,
 *     connection: {
 *       host: process.env.DB_HOST,
 *       port: process.env.DB_PORT,
 *       user: process.env.DB_USER,
 *       password: process.env.DB_PASSWORD,
 *       database: process.env.DB_DATABASE
 *     },
 *     migrations: {
 *       tableName: process.env.DB_MIGRATION_TABLE,
 *       directory: process.env.DB_MIGRATION_DIRECTORY
 *     },
 *     seeds: {
 *       directory: process.env.DB_SEEDS_DIRECTORY
 *     }
 *   })
 * };
 *
 * // app.js
 * const databases = require('./databases');
 * queryFaceNode.setDatabase('todoDB', databases.todoDB);
 */
module.exports.setDatabase = setDatabase;

/**
 * @memberof queryFaceNode.
 * @function runMigrations
 * @param {Object} databases knex database map to execute migrations on all databases
 * @example
 * const queryFaceNode = require('query-face-node');
 * const databases = require('./databases');
 * queryFaceNode.runMigrations(databases);
 */
module.exports.runMigrations = runMigrations;

/**
 * @memberof queryFaceNode.
 * @function runSeeds
 * @param {Object} databases knex database map to execute seeds on all databases
 * @example
 * const queryFaceNode = require('query-face-node');
 * const databases = require('./databases');
 * queryFaceNode.runSeeds(databases);
 */
module.exports.runSeeds = runSeeds;

/**
 * @memberof queryFaceNode.
 * @function addAfterEvent
 * @param {string} eventName this is the same as query template name you want to execute right after query
 * @param {function} event this is the callback function that will be executed after specified query
 * @example
 * queryFaceNode.addAfterEvent('addTodo', (results, errors) => {
 *   console.log('after addTodo query, this function will be executed', results, errors);
 * });
 */
module.exports.addAfterEvent = addAfterEvent;
