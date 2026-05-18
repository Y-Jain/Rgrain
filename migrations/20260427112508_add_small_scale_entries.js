exports.up = function(knex) {
  return knex.schema.createTable('small_scale_entries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.jsonb('bags').notNullable(); // Array of {id, bagType, count, weight, subtotal}
    table.decimal('total_weight', 12, 3).notNullable();
    table.integer('total_bags').notNullable();
    table.decimal('moisture', 5, 2);
    table.decimal('foreign_matter', 5, 2);
    table.string('storage_location');
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('small_scale_entries');
};
