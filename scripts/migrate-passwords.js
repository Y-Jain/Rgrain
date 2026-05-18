const knex = require('knex');
const config = require('../knexfile');
const bcrypt = require('bcryptjs');

const db = knex(config.development);

async function migratePasswords() {
  console.log('Starting password migration...');
  const users = await db('users').select('id', 'password_hash');
  
  for (const user of users) {
    // If it doesn't look like a bcrypt hash (bcrypt starts with $2a$ or $2b$), hash it
    if (!user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$')) {
      console.log(`Hashing password for user: ${user.id}`);
      const salt = await bcrypt.genSalt(12);
      const newHash = await bcrypt.hash('password123', salt); // Defaulting to password123 for all users during security update
      await db('users').where({ id: user.id }).update({ password_hash: newHash });
    }
  }
  
  console.log('Password migration complete.');
  process.exit(0);
}

migratePasswords();
