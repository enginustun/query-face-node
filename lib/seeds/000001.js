exports.seed = function(knex, Promise) {
  const qfTemplatesGroupRecords = [
    {
      name: 'columnInfo',
      isPrivate: true,
    },
    {
      name: 'constraints',
      isPrivate: true,
    },
    {
      name: 'queries',
      isPrivate: true,
    },
    {
      name: 'queryGroups',
      isPrivate: true,
    },
    {
      name: 'queryParamValidations',
      isPrivate: true,
    },
  ];

  const qfTemplatesRecords = [
    // columnInfo
    {
      groupId: 1,
      name: 'getOneColumnInfo',
      query:
        '[{"$op":"from","$params":["qfc~~${tableName}"]},{"$op":"columnInfo","$params":["qfc~~*"]}]',
      version: 1,
      isPrivate: true,
    },
    {
      groupId: 1,
      name: 'getColumnInfo',
      query:
        '[{"$op":"distinct","$params":["cls.column_name as columnName","cls.column_default as defaultValue","cls.is_nullable as nullable","cls.data_type as type","cls.character_maximum_length as max","con.contype as constraintType"]},{"$op":"from","$params":["qfc~~information_schema.columns as cls"]},{"$op":"leftOuterJoin","$params":["qfc~~information_schema.constraint_column_usage as ccu","qfc~~ccu.column_name","qfc~~cls.column_name"]},{"$op":"leftOuterJoin","$params":["qfc~~pg_constraint as con","qfc~~con.conname","qfc~~ccu.constraint_name"]},{"$op":"where","$params":["qfc~~cls.table_schema","qfc~~=","public"]},{"$op":"andWhere","$params":["qfc~~cls.table_name","qfc~~=","${tableName}"]},{"$op":"andWhere","$params":[],"$callback":[{"$op":"where","$params":["qfc~~con.contype","qfc~~!=","f"]},{"$op":"orWhereNull","$params":["qfc~~con.contype"]}]}]',
      version: 1,
      isPrivate: true,
    },

    // constraints
    {
      groupId: 2,
      name: 'getConstraints',
      query:
        '[{"$op":"select","$params":["qfc~~kcu.column_name as columnName","qfc~~kcu.table_name as tableName","qfc~~ccu.column_name as referenceColumnName","qfc~~ccu.table_name as referenceTableName","qfc~~con.contype as constraintType"]},{"$op":"from","$params":["qfc~~pg_constraint as con"]},{"$op":"innerJoin","$params":["qfc~~pg_class as rel","qfc~~rel.oid","qfc~~con.conrelid"]},{"$op":"innerJoin","$params":["qfc~~pg_namespace as nsp","qfc~~nsp.oid","qfc~~connamespace"]},{"$op":"innerJoin","$params":["qfc~~information_schema.key_column_usage as kcu","qfc~~kcu.constraint_name","qfc~~con.conname"]},{"$op":"innerJoin","$params":["qfc~~information_schema.constraint_column_usage as ccu","qfc~~ccu.constraint_name","qfc~~con.conname"]},{"$op":"where","$params":["qfc~~nsp.nspname","qfc~~=","public"]},{"$op":"andWhere","$params":["qfc~~rel.relname","qfc~~=","${tableName}"]}]',
      version: 1,
      isPrivate: true,
    },

    // queries
    {
      groupId: 3,
      name: 'getQueries',
      query:
        '[{"$op":"select","$params":["qfc~~*"]},{"$op":"from","$params":["qfc~~query_face_templates"]},{"$op":"where","$params":["qfc~~groupId","qfc~~=","${groupId}"]},{"$op":"orderBy","$params":[["name",{"column":"version","order":"desc"}]]}]',
      version: 1,
      isPrivate: true,
    },

    // queryGroups
    {
      groupId: 4,
      name: 'getQueryGroups',
      query:
        '[{"$op":"select","$params":["qfc~~*"]},{"$op":"from","$params":["qfc~~query_face_templates_group"]}]',
      version: 1,
      isPrivate: true,
    },
    {
      groupId: 4,
      name: 'updateQueryGroups',
      query:
        '[{"$op":"update","$params":["qfc~~query_face_templates_group"]},{"$op":"set","$params":[{"name":"${name}","isPrivate":"${isPrivate}"}]},{"$op":"where","$params":["qfc~~id","qfc~~=","${id}"]}]',
      version: 1,
      isPrivate: true,
    },
    {
      groupId: 4,
      name: 'deleteQueryGroups',
      query:
        '[{"$op":"delete","$params":["qfc~~query_face_templates_group"]},{"$op":"where","$params":["qfc~~id","qfc~~=","${id}"]}]',
      version: 1,
      isPrivate: true,
    },
    {
      groupId: 4,
      name: 'addQueryGroups',
      query:
        '[{"$op":"returning","$params":["*"]},{"$op":"insert","$params":[{"name":"${name}","isPrivate":"${isPrivate}"}]},{"$op":"into","$params":["qfc~~query_face_templates_group"]}]',
      version: 1,
      isPrivate: true,
    },

    // queryParamValidations
    {
      groupId: 5,
      name: 'addQueryParamValidations',
      query:
        '[{"$op":"returning","$params":["*"]},{"$op":"insert","$params":[{"templateId":"${templateId}","validations":"${validations}"}]},{"$op":"into","$params":["qfc~~query_face_templates_validations"]}]',
      version: 1,
      isPrivate: true,
    },
    {
      groupId: 5,
      name: 'getQueryParamValidations',
      query:
        '[{"$op":"select","$params":["qfc~~*"]},{"$op":"from","$params":["qfc~~query_face_templates_validations"]}]',
      version: 1,
      isPrivate: true,
    },
    {
      groupId: 5,
      name: 'getOneQueryParamValidations',
      query:
        '[{"$op":"select","$params":["qfc~~*"]},{"$op":"from","$params":["qfc~~query_face_templates_validations"]},{"$op":"where","$params":["qfc~~templateId","qfc~~=","${templateId}"]}]',
      version: 1,
      isPrivate: true,
    },
    {
      groupId: 5,
      name: 'updateQueryParamValidations',
      query:
        '[{"$op":"update","$params":["qfc~~query_face_templates_validations"]},{"$op":"set","$params":[{"validations":"${validations}"}]},{"$op":"where","$params":["qfc~~id","qfc~~=","${id}"]}]',
      version: 1,
      isPrivate: true,
    },
  ];

  // Inserts seed entries
  return knex('query_face_templates_group')
    .insert(qfTemplatesGroupRecords)
    .then(function() {
      return knex('query_face_templates').insert(qfTemplatesRecords);
    });
};
