/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('users', (table) => {
      table.index(['branch_id']);
    })
    .alterTable('weighbridge_slips', (table) => {
      table.index(['branch_id']);
      table.index(['farmer_id']);
      table.index(['status']);
      table.index(['created_at']);
    })
    .alterTable('stock_movements', (table) => {
      table.index(['branch_id']);
      table.index(['slip_id']);
    })
    .alterTable('small_scale_entries', (table) => {
      table.index(['branch_id']);
      table.index(['status']);
      table.index(['created_at']);
    })
    .alterTable('ledgers', (table) => {
      table.index(['branch_id']);
      table.index(['related_id']);
      table.index(['ledger_type']);
      table.index(['created_at']);
    })
    .alterTable('holidays', (table) => {
      table.index(['branch_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('users', (table) => {
      table.dropIndex(['branch_id']);
    })
    .alterTable('weighbridge_slips', (table) => {
      table.dropIndex(['branch_id']);
      table.dropIndex(['farmer_id']);
      table.dropIndex(['status']);
      table.dropIndex(['created_at']);
    })
    .alterTable('stock_movements', (table) => {
      table.dropIndex(['branch_id']);
      table.dropIndex(['slip_id']);
    })
    .alterTable('small_scale_entries', (table) => {
      table.dropIndex(['branch_id']);
      table.dropIndex(['status']);
      table.dropIndex(['created_at']);
    })
    .alterTable('ledgers', (table) => {
      table.dropIndex(['branch_id']);
      table.dropIndex(['related_id']);
      table.dropIndex(['ledger_type']);
      table.dropIndex(['created_at']);
    })
    .alterTable('holidays', (table) => {
      table.dropIndex(['branch_id']);
    });
};
