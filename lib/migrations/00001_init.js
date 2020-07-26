exports.up = function(knex) {
  return knex.schema
    .createTable('query_face_templates_group', function(table) {
      table.increments('id').primary();
      table
        .string('name', 100)
        .unique()
        .notNullable();
      table.boolean('isPrivate').defaultTo(true);
    })
    .createTable('query_face_templates', function(table) {
      table.increments('id').primary();
      table
        .integer('groupId')
        .references('id')
        .inTable('query_face_templates_group');
      table.string('name', 100).notNullable();
      table.string('dbName', 100).defaultTo('qfdb');
      table.boolean('transaction').defaultTo(false);
      table.boolean('dependent').defaultTo(false);
      table.text('query');
      table.integer('version').defaultTo(1);
      table.boolean('isPrivate').defaultTo(true);
      table.unique(['name', 'version']);
    })
    .createTable('query_face_templates_validations', function(table) {
      table.increments('id').primary();
      table
        .integer('templateId')
        .references('id')
        .inTable('query_face_templates');
      table.json('validations');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('query_face_templates_validations')
    .dropTable('query_face_templates')
    .dropTable('query_face_templates_group');
};
