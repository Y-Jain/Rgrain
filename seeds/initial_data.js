/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('stock_movements').del();
  await knex('weighbridge_slips').del();
  await knex('users').del();
  await knex('farmers').del();
  await knex('branches').del();

  // Insert Branches
  const [branch1, branch2] = await knex('branches').insert([
    { name: 'Karnal Mandi', location: 'Karnal, Haryana', address: '123 Mandi Road', contact_person: 'Ashok Sharma', config: JSON.stringify({ categories: ['Wheat', 'Paddy', 'Maize'] }) },
    { name: 'Sonepat Godown', location: 'Sonepat, Haryana', address: '456 Industrial Area', contact_person: 'Vikram Singh', config: JSON.stringify({ categories: ['Wheat', 'Barley'] }) }
  ]).returning('*');

  // Insert Users
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash('password123', salt);
  const superAdminHash = await bcrypt.hash('Neetanitesh@90', salt);

  await knex('users').insert([
    { 
      name: 'Super Admin', 
      email: 'jainyash9098@gmail.com', 
      password_hash: superAdminHash, 
      role: 'superadmin', 
      permissions: JSON.stringify({ all: true }) 
    },
    { 
      name: 'Ashok Sharma', 
      email: 'ashok@karnalmandi.com', 
      password_hash: defaultHash, 
      role: 'admin', 
      branch_id: branch1.id,
      permissions: JSON.stringify({ canApprove: true, canManageStaff: true }) 
    },
    { 
      name: 'Suraj Pal', 
      email: 'suraj@karnalmandi.com', 
      password_hash: defaultHash, 
      role: 'staff', 
      branch_id: branch1.id,
      permissions: JSON.stringify({ canCreateSlips: true, canPrintSlips: true }) 
    }
  ]);

  // Insert Farmers
  const CryptoJS = require('crypto-js');
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-encryption-key-32-chars-long';
  
  const encrypt = (data) => CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();

  const [farmer1, farmer2] = await knex('farmers').insert([
    { 
      name: 'Rajesh Kumar', 
      mobile: encrypt('9876543210'), 
      village: 'Rampur', 
      district: 'Karnal', 
      state: 'Haryana', 
      aadhaar_no: encrypt('123456789012') 
    },
    { 
      name: 'Amit Singh', 
      mobile: encrypt('8765432109'), 
      village: 'Sonepat', 
      district: 'Sonepat', 
      state: 'Haryana', 
      aadhaar_no: encrypt('234567890123') 
    }
  ]).returning('*');

  // Insert some mock slips for testing
  await knex('weighbridge_slips').insert([
    { 
      slip_no: 'SLIP-001', 
      farmer_id: farmer1.id, 
      vehicle_no: 'HR-26-AB-1234', 
      grain_category: 'Wheat', 
      gross_weight: 4500, 
      tare_weight: 1200, 
      net_weight: 3300, 
      rate_per_mt: 2275, 
      payable_amount: 7507.5, 
      status: 'PENDING', 
      branch_id: branch1.id 
    }
  ]);
};
