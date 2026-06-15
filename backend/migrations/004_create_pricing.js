exports.up = function (knex) {
  return knex.schema.createTable('center_pricing', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('center_id').notNullable().references('id').inTable('imaging_centers').onDelete('CASCADE');
    table.uuid('protocol_id').notNullable().references('id').inTable('protocols').onDelete('CASCADE');
    table.decimal('price', 10, 2).notNullable();
    table.string('price_source', 20).defaultTo('program'); // 'site' or 'program'
    table.boolean('is_available').notNullable().defaultTo(true);
    table.text('notes');
    table.timestamps(true, true);

    // A center can only have one price per protocol
    table.unique(['center_id', 'protocol_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('center_pricing');
};
