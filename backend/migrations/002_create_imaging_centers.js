exports.up = async function (knex) {
  await knex.schema.createTable('imaging_centers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('slug', 255).notNullable().unique();
    table.text('description');
    table.string('phone', 20);
    table.string('phone_normalized', 20); // digits-only, for uniqueness matching
    table.string('fax', 20);
    table.string('email', 255);
    table.string('website', 255);

    // Address
    table.string('address_line1', 255).notNullable();
    table.string('address_line2', 100);
    table.string('city', 100).notNullable();
    table.string('state', 2).notNullable();
    table.string('zip_code', 10).notNullable();

    // Geolocation for distance search
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);

    // Meta
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('accepts_walkins').notNullable().defaultTo(false);
    table.boolean('same_day_appointments').notNullable().defaultTo(true);
    table.text('hours_of_operation'); // JSON string
    table.string('accreditation', 100); // ACR, IAC, etc.
    table.string('npi_number', 20);     // optional, NOT unique
    table.integer('typical_wait_days').defaultTo(1);

    // Center notification timestamps (welcome email / pricing-live email)
    table.timestamp('welcome_email_sent_at');
    table.timestamp('pricing_notified_at');

    table.uuid('created_by').references('id').inTable('users');
    table.timestamps(true, true);
  });

  // Composite UNIQUE index on (LOWER(email), phone_normalized).
  // Partial: only enforced when both present, so centers without contact
  // info don't collide on NULLs.
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS imaging_centers_email_phone_unique
    ON imaging_centers (LOWER(email), phone_normalized)
    WHERE email IS NOT NULL AND phone_normalized IS NOT NULL AND phone_normalized <> ''
  `);
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('imaging_centers');
};
