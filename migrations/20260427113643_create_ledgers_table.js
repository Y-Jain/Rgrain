exports.up = function(knex) {
  return knex.schema.createTable('ledgers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE');
    table.string('ledger_type').notNullable(); // FARMER, CUSTOMER, INTERNAL, CASH, BANK, EXPENSE
    table.uuid('related_id'); // slip_id, farmer_id, etc.
    table.string('narration');
    table.decimal('debit', 12, 2).defaultTo(0);
    table.decimal('credit', 12, 2).defaultTo(0);
    table.decimal('balance', 12, 2).defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('ledgers');
};
