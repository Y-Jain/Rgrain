/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('holidays', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.date('date').notNullable();
      table.string('description');
      table.uuid('branch_id').references('id').inTable('branches').onDelete('CASCADE');
      table.timestamps(true, true);
    })
    .createTable('attendance', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.date('date').notNullable();
      table.string('status').notNullable(); // PRESENT, ABSENT, LEAVE, HOLIDAY
      table.string('remarks');
      table.timestamps(true, true);
      table.unique(['user_id', 'date']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('attendance')
    .dropTableIfExists('holidays');
};
