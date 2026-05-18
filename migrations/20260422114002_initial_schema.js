/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('branches', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('location');
      table.string('address');
      table.string('contact_person');
      table.jsonb('config'); // For grain categories, etc.
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('role').notNullable(); // superadmin, admin, staff
      table.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
      table.jsonb('permissions');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('farmers', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('mobile').unique().notNullable();
      table.string('alternate_mobile');
      table.string('village');
      table.string('tehsil');
      table.string('district');
      table.string('state');
      table.jsonb('bank_details'); // acc_no, ifsc, bank_name
      table.string('aadhaar_no').unique();
      table.string('kcc_no');
      table.jsonb('kyc_documents');
      table.integer('credit_score').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('weighbridge_slips', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('slip_no').unique().notNullable();
      table.uuid('farmer_id').references('id').inTable('farmers').onDelete('CASCADE');
      table.string('vehicle_no').notNullable();
      table.string('driver_name');
      table.string('grain_category').notNullable();
      table.decimal('gross_weight', 12, 3);
      table.decimal('tare_weight', 12, 3);
      table.decimal('net_weight', 12, 3);
      table.decimal('rate_per_mt', 12, 2);
      table.decimal('payable_amount', 12, 2);
      table.string('status').defaultTo('PENDING'); // PENDING, APPROVED, REJECTED, PAID
      table.text('rejection_reason');
      table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE');
      table.uuid('created_by').references('id').inTable('users');
      table.uuid('approved_by').references('id').inTable('users');
      table.timestamps(true, true);
    })
    .createTable('stock_movements', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('type').notNullable(); // INWARD, OUTWARD, TRANSFER
      table.uuid('slip_id').references('id').inTable('weighbridge_slips').onDelete('SET NULL');
      table.string('grain_category').notNullable();
      table.decimal('quantity', 12, 3);
      table.string('storage_location'); // godown/bin
      table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('stock_movements')
    .dropTableIfExists('weighbridge_slips')
    .dropTableIfExists('farmers')
    .dropTableIfExists('users')
    .dropTableIfExists('branches');
};
