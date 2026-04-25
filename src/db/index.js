const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.USER_DB_HOST,
  port: process.env.USER_DB_PORT,
  database: process.env.USER_DB_NAME,
  user: process.env.USER_DB_USER,
  password: process.env.USER_DB_PASSWORD,
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    // Connected to User DB, initializing tables...
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // User DB initialization complete.
  } catch (err) {
    // Error initializing User DB
    process.exit(1);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
  pool
};
