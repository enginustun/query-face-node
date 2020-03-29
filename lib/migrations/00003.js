exports.up = function(knex) {
  return knex.schema.table('query_face_templates', function(table) {
    table.increments('id').primary();
    table
      .integer('groupId')
      .references('id')
      .inTable('query_face_templates_group');
    table.integer('version').defaultTo(1);
    table.unique(['name', 'version']);
    table.boolean('isPrivate').defaultTo(true);
  });
};

exports.down = function(knex) {
  return knex.schema.table('query_face_templates', function(table) {
    table.dropUnique(['name', 'version']);
    table.dropColumn('groupId');
    table.dropColumn('id');
    table.dropColumn('version');
    table.dropColumn('isPrivate');
  });
};
