const router = require('./lib/middleware/router');
const setDatabase = require('./lib/databases').setDatabase;
const {
  runMigrations,
  listMigrations,
  makeMigrations,
  latestMigrations,
  rollbackMigrations,
  upMigrations,
  downMigrations,
  currentVersionMigrations,
} = require('./lib/migrations');
const runSeeds = require('./lib/run-seeds');
const { addEvent: addBeforeEvent } = require('./lib/query-events/before');
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
 */
module.exports = router;

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
 * Creates a new migration, with the name of the migration being added.
 *
 * @memberof queryFaceNode.
 * @function makeMigrations
 * @param {Object} db knex database to execute migrations on it
 * @param {String} name migration name
 * @param {Object} [config={}] migration config
 * @example
 * const queryFaceNode = require('query-face-node');
 * const db = require('./databases').dbName;
 * queryFaceNode.makeMigrations(db, 'dbName', config);
 */
module.exports.makeMigrations = makeMigrations;

/**
 * Runs all migrations that have not yet been run.
 *
 * @memberof queryFaceNode.
 * @function latestMigrations
 * @param {Object} db knex database to execute latest function on it
 * @param {Object} [config={}] migration config
 * @example
 * const queryFaceNode = require('query-face-node');
 * const db = require('./databases').dbName;
 * queryFaceNode.latestMigrations(db, config);
 */
module.exports.latestMigrations = latestMigrations;

/**
 * Rolls back the latest migration group.
 * If the all parameter is truthy, all applied migrations will be rolled back instead of just the last batch.
 * The default value for this parameter is false.
 *
 * @memberof queryFaceNode.
 * @function rollbackMigrations
 * @param {Object} db knex database to execute rollback function on it
 * @param {boolean} [all=false] if truthy all applied migrations will be rolled back
 * @param {Object} [config={}] migration config
 * @example
 * const queryFaceNode = require('query-face-node');
 * const db = require('./databases').dbName;
 * queryFaceNode.rollbackMigrations(db, [true|false], config);
 */
module.exports.rollbackMigrations = rollbackMigrations;

/**
 * Runs the specified (by config.name parameter) or the next chronological migration that has not yet be run.
 *
 * @memberof queryFaceNode.
 * @function upMigrations
 * @param {Object} db knex database to execute up function on it
 * @param {Object} [config={}] migration config
 * @example
 * const queryFaceNode = require('query-face-node');
 * const db = require('./databases').dbName;
 * queryFaceNode.upMigrations(db, config);
 */
module.exports.upMigrations = upMigrations;

/**
 * Will undo the specified (by config.name parameter) or the last migration that was run.
 *
 * @memberof queryFaceNode.
 * @function downMigrations
 * @param {Object} db knex database to execute down function on it
 * @param {Object} [config={}] migration config
 * @example
 * const queryFaceNode = require('query-face-node');
 * const db = require('./databases').dbName;
 * queryFaceNode.downMigrations(db, config);
 */
module.exports.downMigrations = downMigrations;

/**
 * Retrieves and returns the current migration version, as a promise.
 * If there aren't any migrations run yet, returns "none" as the value for the currentVersion.
 *
 * @memberof queryFaceNode.
 * @function currentVersionMigrations
 * @param {Object} db knex database to execute currentVersion function on it
 * @param {Object} [config={}] migration config
 * @example
 * const queryFaceNode = require('query-face-node');
 * const db = require('./databases').dbName;
 * queryFaceNode.currentVersionMigrations(db, config);
 */
module.exports.currentVersionMigrations = currentVersionMigrations;

/**
 * Will return list of completed and pending migrations
 *
 * @memberof queryFaceNode.
 * @function listMigrations
 * @param {Object} db knex database to execute list function on it
 * @param {Object} [config={}] migration config
 * @example
 * const queryFaceNode = require('query-face-node');
 * const db = require('./databases').dbName;
 * queryFaceNode.listMigrations(db, config);
 */
module.exports.listMigrations = listMigrations;

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
 * @function addBeforeEvent
 * @param {string} eventName this is the same as query template name you want to execute right before query
 * @param {function} event this is the callback function that will be executed before specified query
 * @returns {boolean|object} if you want to block operation you need to return false
 * or error object that contains <strong>{status, error, ...customPropertiesYouNeed}</strong>
 * @example
 * queryFace.addBeforeEvent('getTodos', (req, res, query) => {
 *   // some calculations, checks, validations...
 *   // return false;
 *   return {
 *     status: 400,
 *     error: 'There are some errors',
 *     validationErrors: [{ field: 'email', message: 'This should be a valid email.' }]
 *   };
 * });
 */
module.exports.addBeforeEvent = addBeforeEvent;

/**
 * @memberof queryFaceNode.
 * @function addAfterEvent
 * @param {string} eventName this is the same as query template name you want to execute right after query
 * @param {function} event this is the callback function that will be executed after specified query
 * @example
 * queryFaceNode.addAfterEvent('addTodo', (req, res, results, errors) => {
 *   console.log('after addTodo query, this function will be executed', results, errors);
 * });
 */
module.exports.addAfterEvent = addAfterEvent;
