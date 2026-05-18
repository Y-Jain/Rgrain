require('dotenv').config();
const knexConfig = require('../knexfile');
const bcrypt = require('bcryptjs');

// Determine environment
const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
  console.error(`❌ Knex configuration not found for environment: ${environment}`);
  process.exit(1);
}

const db = require('knex')(config);

async function updateSuperAdmin() {
  console.log(`🔌 Connecting to the database [${environment}]...`);
  
  try {
    const newEmail = 'jainyash9098@gmail.com';
    const newPassword = 'Neetanitesh@90';
    
    // Hash new password
    console.log('🔑 Hashing the new password...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Check if a superadmin exists
    const superadmin = await db('users').where({ role: 'superadmin' }).first();
    
    if (superadmin) {
      console.log(`👤 Found existing Super Admin (ID: ${superadmin.id}, Email: ${superadmin.email}). Updating...`);
      await db('users')
        .where({ id: superadmin.id })
        .update({
          email: newEmail,
          password_hash: passwordHash,
          name: 'Super Admin'
        });
      console.log('✅ Super Admin email and password updated successfully in the database!');
    } else {
      console.log('👤 No Super Admin found in the database. Inserting new Super Admin...');
      await db('users').insert({
        name: 'Super Admin',
        email: newEmail,
        password_hash: passwordHash,
        role: 'superadmin',
        permissions: JSON.stringify({ all: true })
      });
      console.log('✅ New Super Admin created successfully in the database!');
    }
  } catch (error) {
    console.error('❌ Error updating Super Admin:', error.message);
  } finally {
    await db.destroy();
    console.log('🔌 Connection closed.');
  }
}

updateSuperAdmin();
