const logger = require('./logger');

const initializeDatabase = async (pool) => {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);

    // Create index on updated_at
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at)
    `);

    // Create watermarks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS watermarks (
        id SERIAL PRIMARY KEY,
        consumer_id VARCHAR(255) NOT NULL UNIQUE,
        last_exported_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    logger.info({ event: 'Database initialized successfully' });
  } catch (error) {
    logger.error({ event: 'Failed to initialize database', error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
