/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('action').notNullable();
      table.text('details');
      table.string('severity').defaultTo('low');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .alterTable('users', (table) => {
      table.string('mfa_secret');
      table.boolean('mfa_enabled').defaultTo(false);
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('lockout_until');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('audit_logs')
    .alterTable('users', (table) => {
      table.dropColumn('mfa_secret');
      table.dropColumn('mfa_enabled');
      table.dropColumn('failed_login_attempts');
      table.dropColumn('lockout_until');
    });
};
