const ENV_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'BCRYPT_SALT_ROUNDS',
  'ENCRYPTION_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM'
];

async function syncEnvs() {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const orgId = process.env.VERCEL_ORG_ID;
  const teamId = process.env.VERCEL_TEAM_ID || (orgId && orgId.startsWith('team_') ? orgId : undefined);

  if (!token) {
    console.error('Error: VERCEL_TOKEN environment variable is not defined.');
    process.exit(1);
  }
  if (!projectId) {
    console.error('Error: VERCEL_PROJECT_ID environment variable is not defined.');
    process.exit(1);
  }

  console.log('Starting environment variable sync to Vercel...');

  const queryParams = teamId ? `?teamId=${teamId}` : '';

  // 1. Fetch existing environment variables
  console.log('Fetching existing environment variables from Vercel...');
  const listResponse = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    console.error('❌ Failed to fetch existing environment variables:', errorText);
    process.exit(1);
  }

  const { envs: existingEnvs } = await listResponse.json();
  console.log(`Fetched ${existingEnvs.length} existing variables.`);

  // 2. Loop and sync keys
  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value === undefined) {
      console.warn(`⚠️ Warning: Environment variable "${key}" is not set in this runner environment. Skipping.`);
      continue;
    }

    // 3. Delete existing variables with the same key
    const duplicates = existingEnvs.filter(env => env.key === key);
    for (const dup of duplicates) {
      console.log(`Removing old instance of ${key} (ID: ${dup.id})...`);
      const deleteResponse = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${dup.id}${queryParams}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.warn(`⚠️ Failed to remove old variable "${key}":`, errorText);
      }
    }

    // 4. Create new environment variable
    console.log(`Syncing ${key}...`);
    const createResponse = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env${queryParams}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: key,
        value: String(value),
        type: 'encrypted',
        target: ['production', 'preview']
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`❌ Failed to sync variable "${key}":`, errorText);
      process.exit(1);
    }

    console.log(`✅ Successfully synced "${key}"`);
  }

  console.log('✨ All environment variables synced successfully.');
}

syncEnvs().catch(err => {
  console.error('💥 Unexpected error in sync script:', err);
  process.exit(1);
});
