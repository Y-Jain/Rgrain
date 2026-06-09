import db from '../src/lib/db';

async function test() {
  try {
    const res = await db.raw('SELECT 1');
    console.log("DB connection successful:", res);
  } catch (error) {
    console.error("DB connection failed:", error);
  } finally {
    process.exit(0);
  }
}

test();
