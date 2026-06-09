const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.development);

async function test() {
  const records = await db('small_scale_entries').orderBy('created_at', 'desc').limit(5);
  console.log(records.map(r => ({ slip_no: r.slip_no, total_weight: r.total_weight })));
  process.exit(0);
}
test();
