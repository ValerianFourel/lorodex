// test-connection.ts
import { Pool } from 'pg';

const testConnection = async () => {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'lorodex_production',
    user: process.env.DB_USER || 'valerianfourel',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    const result = await client.query('SELECT current_user, current_database()');
    console.log('Connected as:', result.rows[0]);

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};

testConnection();

