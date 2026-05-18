exports.up = function(knex) {
  return knex.schema.alterTable('small_scale_entries', (table) => {
    table.string('entry_type').defaultTo('IN'); // IN (Purchase) or OUT (Sale)
    table.string('party_name');
    table.string('party_mobile');
    table.string('party_email');
    table.string('grain_category');
    table.decimal('price_per_unit', 12, 2).defaultTo(0);
    table.decimal('total_amount', 12, 2).defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('small_scale_entries', (table) => {
    table.dropColumn('entry_type');
    table.dropColumn('party_name');
    table.dropColumn('party_mobile');
    table.dropColumn('party_email');
    table.dropColumn('grain_category');
    table.dropColumn('price_per_unit');
    table.dropColumn('total_amount');
  });
};
