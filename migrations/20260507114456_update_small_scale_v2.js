exports.up = function(knex) {
  return knex.schema.alterTable('small_scale_entries', (table) => {
    table.string('address');
    table.string('subcategory');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('small_scale_entries', (table) => {
    table.dropColumn('address');
    table.dropColumn('subcategory');
  });
};
