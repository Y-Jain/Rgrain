const knex = require('knex');
const config = require('../knexfile');
const db = knex(config.development);

async function fixWeights() {
  const records = await db('small_scale_entries').select('*');
  let fixed = 0;
  for (const record of records) {
    const nw = parseFloat(record.total_weight) || 0;
    // If weight is less than 50 (which means it was saved as Qtl directly)
    if (nw > 0 && nw < 50) {
      await db('small_scale_entries')
        .where('id', record.id)
        .update({ total_weight: nw * 100 });
      fixed++;
      console.log(`Fixed slip ${record.slip_no}: ${nw} -> ${nw * 100}`);
    }
  }
  console.log(`Finished fixing DB. Total records fixed: ${fixed}`);
  process.exit(0);
}
fixWeights();
