/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('email').nullable().alter();
    table.string('mobile').unique().nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    // In down migration, we revert email to notNullable
    table.string('email').notNullable().alter();
    table.dropColumn('mobile');
  });
};
