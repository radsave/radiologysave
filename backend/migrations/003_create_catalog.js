exports.up = async function (knex) {
  // Modalities (MRI, CT, Ultrasound, etc.)
  await knex.schema.createTable('modalities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique(); // "MRI"
    table.string('slug', 120).unique();             // "mri" for SEO URLs
    table.string('abbreviation', 20);               // "MRI"
    table.text('description');
    table.string('color_hex', 7).defaultTo('#D6E4F0'); // for UI badges
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });

  // Body parts per modality
  await knex.schema.createTable('body_parts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('modality_id').notNullable().references('id').inTable('modalities').onDelete('CASCADE');
    table.string('name', 100).notNullable(); // "Brain"
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });

  // Protocols — the specific scan type (Brain w/o Contrast, etc.)
  await knex.schema.createTable('protocols', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('modality_id').notNullable().references('id').inTable('modalities').onDelete('CASCADE');
    table.uuid('body_part_id').notNullable().references('id').inTable('body_parts').onDelete('CASCADE');
    table.string('name', 255).notNullable();       // "Brain w/o Contrast"
    table.string('slug', 280).unique();            // "mri-brain-wo-contrast" for SEO URLs
    table.text('description');
    table.boolean('requires_contrast').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('duration_minutes').defaultTo(45);
    table.text('patient_prep_instructions');
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('protocols');
  await knex.schema.dropTableIfExists('body_parts');
  await knex.schema.dropTableIfExists('modalities');
};
