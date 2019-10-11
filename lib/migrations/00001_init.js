exports.up = function (knex) {
  return knex.schema.createTable('query_face_templates', function (table) {
    table
      .string('name', 100)
      .primary()
      .notNullable();
    table.text('query');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('query_face_templates');
};
