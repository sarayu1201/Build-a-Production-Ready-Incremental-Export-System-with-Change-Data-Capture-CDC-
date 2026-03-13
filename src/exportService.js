const fs = require('fs');
const path = require('path');
const { CsvWriter } = require('csv-writer');
const logger = require('./logger');
const { updateWatermark } = require('./watermarkService');

const outputDir = process.env.EXPORT_OUTPUT_DIR || './output';
const batchSize = parseInt(process.env.EXPORT_BATCH_SIZE || '5000');

const handleFullExport = async (pool, consumerId, jobId) => {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      // Fetch all non-deleted users
      const result = await client.query(
        'SELECT id, name, email, created_at, updated_at, is_deleted FROM users WHERE is_deleted = FALSE ORDER BY updated_at DESC'
      );
      
      const rows = result.rows;
      const filename = `full_${consumerId}_${Date.now()}.csv`;
      const filepath = path.join(outputDir, filename);
      
      // Create CSV with headers
      let csv = 'id,name,email,created_at,updated_at,is_deleted\n';
      rows.forEach(row => {
        csv += `${row.id},"${row.name}","${row.email}","${row.created_at}","${row.updated_at}",${row.is_deleted}\n`;
      });
      
      fs.writeFileSync(filepath, csv);
      
      // Update watermark
      if (rows.length > 0) {
        const maxUpdatedAt = rows[0].updated_at;
        await updateWatermark(pool, consumerId, maxUpdatedAt);
      }
      
      const duration = Date.now() - startTime;
      logger.info({
        event: 'Export job completed',
        jobId,
        rowsExported: rows.length,
        duration
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ event: 'Export job failed', jobId, error: error.message });
    throw error;
  }
};

const handleIncrementalExport = async (pool, consumerId, jobId) => {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      // Get last watermark
      const watermarkResult = await client.query(
        'SELECT last_exported_at FROM watermarks WHERE consumer_id = $1',
        [consumerId]
      );
      
      let lastExportedAt = new Date('1970-01-01');
      if (watermarkResult.rows.length > 0) {
        lastExportedAt = watermarkResult.rows[0].last_exported_at;
      }
      
      // Fetch incremental records
      const result = await client.query(
        'SELECT id, name, email, created_at, updated_at, is_deleted FROM users WHERE updated_at > $1 AND is_deleted = FALSE ORDER BY updated_at DESC',
        [lastExportedAt]
      );
      
      const rows = result.rows;
      const filename = `incremental_${consumerId}_${Date.now()}.csv`;
      const filepath = path.join(outputDir, filename);
      
      let csv = 'id,name,email,created_at,updated_at,is_deleted\n';
      rows.forEach(row => {
        csv += `${row.id},"${row.name}","${row.email}","${row.created_at}","${row.updated_at}",${row.is_deleted}\n`;
      });
      
      fs.writeFileSync(filepath, csv);
      
      // Update watermark
      if (rows.length > 0) {
        const maxUpdatedAt = rows[0].updated_at;
        await updateWatermark(pool, consumerId, maxUpdatedAt);
      }
      
      const duration = Date.now() - startTime;
      logger.info({
        event: 'Export job completed',
        jobId,
        rowsExported: rows.length,
        duration
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ event: 'Export job failed', jobId, error: error.message });
    throw error;
  }
};

const handleDeltaExport = async (pool, consumerId, jobId) => {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      const watermarkResult = await client.query(
        'SELECT last_exported_at FROM watermarks WHERE consumer_id = $1',
        [consumerId]
      );
      
      let lastExportedAt = new Date('1970-01-01');
      if (watermarkResult.rows.length > 0) {
        lastExportedAt = watermarkResult.rows[0].last_exported_at;
      }
      
      const result = await client.query(
        'SELECT id, name, email, created_at, updated_at, is_deleted FROM users WHERE updated_at > $1 ORDER BY updated_at DESC',
        [lastExportedAt]
      );
      
      const rows = result.rows;
      const filename = `delta_${consumerId}_${Date.now()}.csv`;
      const filepath = path.join(outputDir, filename);
      
      let csv = 'operation,id,name,email,created_at,updated_at\n';
      rows.forEach(row => {
        const operation = row.is_deleted ? 'DELETE' : (row.created_at === row.updated_at ? 'INSERT' : 'UPDATE');
        csv += `${operation},${row.id},"${row.name}","${row.email}","${row.created_at}","${row.updated_at}"\n`;
      });
      
      fs.writeFileSync(filepath, csv);
      
      if (rows.length > 0) {
        const maxUpdatedAt = rows[0].updated_at;
        await updateWatermark(pool, consumerId, maxUpdatedAt);
      }
      
      const duration = Date.now() - startTime;
      logger.info({
        event: 'Export job completed',
        jobId,
        rowsExported: rows.length,
        duration
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ event: 'Export job failed', jobId, error: error.message });
    throw error;
  }
};

module.exports = { handleFullExport, handleIncrementalExport, handleDeltaExport };
