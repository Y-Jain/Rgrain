const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.development);

async function test() {
  const records = await db('small_scale_entries').limit(1);
  console.log(records[0]);
  process.exit(0);
}
test();
