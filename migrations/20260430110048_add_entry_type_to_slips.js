/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('weighbridge_slips', table => {
    table.string('entry_type').defaultTo('IN'); // 'IN' or 'OUT'
    table.boolean('is_internal').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('weighbridge_slips', table => {
    table.dropColumn('entry_type');
    table.dropColumn('is_internal');
  });
};
