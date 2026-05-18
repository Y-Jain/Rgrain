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
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token) {
    console.error('Error: VERCEL_TOKEN environment variable is not defined.');
    process.exit(1);
  }
  if (!projectId) {
    console.error('Error: VERCEL_PROJECT_ID environment variable is not defined.');
    process.exit(1);
  }

  console.log('Starting environment variable sync to Vercel...');

  let url = `https://api.vercel.com/v9/projects/${projectId}/env?upsert=true`;
  if (teamId) {
    url += `&teamId=${teamId}`;
  }

  for (const key of ENV_KEYS) {
    const value = process.env[key];
    if (value === undefined) {
      console.warn(`⚠️ Warning: Environment variable "${key}" is not set in this runner environment. Skipping.`);
      continue;
    }

    console.log(`Syncing ${key}...`);

    const response = await fetch(url, {
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

    if (!response.ok) {
      const errorText = await response.text();
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
