const { Pool } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgrespassword',
  database: process.env.DB_DATABASE || 'smarthomedb',
};

const pool = new Pool(dbConfig);

// Run migrations on start
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ Error acquiring client from database pool:', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL database successfully.');
    try {
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;');
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;');
      console.log('✅ Checked/added payment_receipt_url, user profile columns, and is_active column to database.');
    } catch (dbErr) {
      console.error('❌ Failed to run database migrations:', dbErr);
    }
    release();
  }
});

module.exports = pool;
