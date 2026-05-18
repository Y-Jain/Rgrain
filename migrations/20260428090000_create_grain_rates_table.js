exports.up = function(knex) {
  return knex.schema.createTable('grain_rates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.string('category_name').notNullable();
    table.decimal('procurement_rate', 12, 2).defaultTo(0);
    table.decimal('selling_rate', 12, 2).defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.unique(['branch_id', 'category_name']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('grain_rates');
};
