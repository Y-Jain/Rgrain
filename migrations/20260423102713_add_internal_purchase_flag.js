/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('weighbridge_slips', (table) => {
    table.boolean('is_internal_purchase').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('weighbridge_slips', (table) => {
    table.dropColumn('is_internal_purchase');
  });
};
