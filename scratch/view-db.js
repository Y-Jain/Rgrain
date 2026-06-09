const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.development);

async function viewData() {
  const records = await db('small_scale_entries').select('*');
  console.log(records.map(r => ({ slip_no: r.slip_no, grain: r.grain_category, weight: r.total_weight, rate: r.price_per_unit, amount: r.total_amount })));
  process.exit(0);
}
viewData();
