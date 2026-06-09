const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.development);

async function test() {
  const locks = await db.raw(`
    SELECT pid, state, query, wait_event_type, wait_event
    FROM pg_stat_activity
    WHERE state != 'idle' AND pid != pg_backend_pid();
  `);
  console.log(locks.rows);
  process.exit(0);
}
test();
