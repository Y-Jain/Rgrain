/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .table('weighbridge_slips', (table) => {
      table.integer('serial_number');
      table.string('subcategory');
      table.decimal('tollkata_charges', 12, 2).defaultTo(0);
      table.string('vehicle_type');
    })
    .table('grain_rates', (table) => {
      table.jsonb('subcategories').defaultTo('[]');
    })
    .createTable('vehicle_rates', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE');
      table.string('vehicle_type').notNullable();
      table.decimal('rate', 12, 2).defaultTo(0);
      table.timestamps(true, true);
      table.unique(['branch_id', 'vehicle_type']);
    })
    .createTable('weighbridge_settings', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE').unique();
      table.integer('starting_serial_number').defaultTo(1);
      table.integer('current_serial_number').defaultTo(0);
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('weighbridge_settings')
    .dropTableIfExists('vehicle_rates')
    .table('grain_rates', (table) => {
      table.dropColumn('subcategories');
    })
    .table('weighbridge_slips', (table) => {
      table.dropColumn('serial_number');
      table.dropColumn('subcategory');
      table.dropColumn('tollkata_charges');
      table.dropColumn('vehicle_type');
    });
};
