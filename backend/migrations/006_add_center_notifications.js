/**
 * Notification timestamp columns are now created directly in migration 002.
 * This migration is kept as a no-op so migration history stays consistent
 * across environments (and adds the columns only if an older 002 lacked them).
 */
exports.up = async function (knex) {
  const hasWelcome = await knex.schema.hasColumn('imaging_centers', 'welcome_email_sent_at');
  const hasNotified = await knex.schema.hasColumn('imaging_centers', 'pricing_notified_at');
  if (!hasWelcome || !hasNotified) {
    await knex.schema.alterTable('imaging_centers', (table) => {
      if (!hasWelcome) table.timestamp('welcome_email_sent_at');
      if (!hasNotified) table.timestamp('pricing_notified_at');
    });
  }
};

exports.down = function () {
  // no-op: columns are owned by migration 002
  return Promise.resolve();
};
