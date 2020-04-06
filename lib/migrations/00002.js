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
    .table('query_face_templates', function(table) {
      table.dropPrimary();
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('query_face_templates', function(table) {
      table
        .string('name', 100)
        .primary()
        .notNullable()
        .alter();
    })
    .dropTable('query_face_templates_group');
};
