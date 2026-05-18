const knex = require('knex')(require('./knexfile').development);

async function check() {
  const wb = await knex('weighbridge_slips').select('grain_category', 'subcategory', 'status').limit(20);
  const ss = await knex('small_scale_entries').select('grain_category', 'subcategory', 'status').limit(20);
  console.log('WB:', wb);
  console.log('SS:', ss);
  process.exit(0);
}

check();
