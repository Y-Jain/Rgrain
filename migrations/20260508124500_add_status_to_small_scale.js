exports.up = function(knex) {
  return knex.schema.alterTable('small_scale_entries', (table) => {
    table.string('status').defaultTo('PENDING');
    table.text('reject_reason');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('small_scale_entries', (table) => {
    table.dropColumn('status');
    table.dropColumn('reject_reason');
  });
};
