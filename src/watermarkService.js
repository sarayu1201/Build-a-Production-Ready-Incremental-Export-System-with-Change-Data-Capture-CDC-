const logger = require('./logger');

const getWatermark = async (pool, consumerId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT last_exported_at FROM watermarks WHERE consumer_id = $1',
      [consumerId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].last_exported_at.toISOString();
  } catch (error) {
    logger.error({ event: 'Error fetching watermark', error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

const updateWatermark = async (pool, consumerId, lastExportedAt) => {
  const client = await pool.connect();
  try {
    // Check if watermark exists
    const checkResult = await client.query(
      'SELECT id FROM watermarks WHERE consumer_id = $1',
      [consumerId]
    );
    
    const now = new Date();
    
    if (checkResult.rows.length === 0) {
      // Insert new watermark
      await client.query(
        'INSERT INTO watermarks (consumer_id, last_exported_at, updated_at) VALUES ($1, $2, $3)',
        [consumerId, lastExportedAt, now]
      );
    } else {
      // Update existing watermark
      await client.query(
        'UPDATE watermarks SET last_exported_at = $1, updated_at = $2 WHERE consumer_id = $3',
        [lastExportedAt, now, consumerId]
      );
    }
    
    logger.info({ event: 'Watermark updated', consumerId, lastExportedAt });
  } catch (error) {
    logger.error({ event: 'Error updating watermark', error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { getWatermark, updateWatermark };
