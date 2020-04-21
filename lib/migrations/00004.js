exports.up = function(knex) {
  return knex.schema.createTable('query_face_templates_validations', function(
    table
  ) {
    table.increments('id').primary();
    table
      .integer('templateId')
      .references('id')
      .inTable('query_face_templates');
    table.json('validations');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('query_face_templates_validations');
};
