exports.up = async function (knex) {
  // Appointments — two-step lifecycle:
  //   pending_confirmation → confirmed → paid → completed | cancelled | refunded
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('confirmation_number', 20).notNullable().unique();

    // Patient info (stored even for guests)
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('patient_first_name', 100).notNullable();
    table.string('patient_last_name', 100).notNullable();
    table.string('patient_email', 255).notNullable();
    table.string('patient_phone', 20).notNullable();
    table.date('patient_dob');

    // What / where
    table.uuid('center_id').notNullable().references('id').inTable('imaging_centers');
    table.uuid('protocol_id').notNullable().references('id').inTable('protocols');
    table.uuid('pricing_id').references('id').inTable('center_pricing');
    table.decimal('amount_charged', 10, 2).notNullable();

    // Physician referral
    table.string('referring_physician', 255);
    table.string('referral_file_url', 500);
    table.boolean('has_referral').notNullable().defaultTo(false);

    // Step 1 — patient's requested timing
    table.date('preferred_date');
    table.string('preferred_window', 20); // 'morning' | 'afternoon'
    table.text('special_notes');

    // Step 2 — RS confirmation
    table.timestamp('appointment_datetime');
    table.timestamp('confirmed_at');
    table.uuid('confirmed_by').references('id').inTable('users');

    // 24h payment window
    table.timestamp('payment_due_at');
    table.timestamp('paid_at');
    table.timestamp('cancelled_at');
    table.string('cancellation_reason', 255);

    // Status
    table.string('status', 30).notNullable().defaultTo('pending_confirmation');

    // Email audit (idempotency)
    table.timestamp('booking_email_sent_at');
    table.timestamp('confirm_email_sent_at');
    table.timestamp('paid_email_sent_at');
    table.timestamp('expired_email_sent_at');

    // Voucher
    table.string('voucher_code', 50);
    table.timestamp('voucher_sent_at');

    table.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_status_check
    CHECK (status IN (
      'pending_confirmation','confirmed','paid',
      'completed','cancelled','refunded'
    ))
  `);

  // Payments table
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('appointment_id').notNullable().references('id').inTable('appointments').onDelete('CASCADE');

    table.string('stripe_payment_intent_id', 255).unique();
    table.string('stripe_checkout_session_id', 255).unique();
    table.string('stripe_charge_id', 255);
    table.string('stripe_customer_id', 255);

    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).notNullable().defaultTo('usd');
    table.enu('status', ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'])
      .notNullable().defaultTo('pending');
    table.decimal('amount_refunded', 10, 2).defaultTo(0);
    table.string('failure_code', 100);
    table.text('failure_message');

    table.jsonb('stripe_metadata');

    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('appointments');
};
