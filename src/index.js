require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { initializeDatabase } = require('./database');
const { handleFullExport, handleIncrementalExport, handleDeltaExport } = require('./exportService');
const { getWatermark } = require('./watermarkService');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Full Export Endpoint
app.post('/exports/full', async (req, res) => {
  const consumerId = req.headers['x-consumer-id'];
  if (!consumerId) {
    return res.status(400).json({ error: 'X-Consumer-ID header required' });
  }
  
  const jobId = uuidv4();
  logger.info({
    event: 'Export job started',
    jobId,
    consumerId,
    exportType: 'full'
  });
  
  res.status(202).json({
    jobId,
    status: 'started',
    exportType: 'full',
    outputFilename: `full_${consumerId}_${Date.now()}.csv`
  });
  
  // Process asynchronously
  handleFullExport(pool, consumerId, jobId).catch(err => {
    logger.error({
      event: 'Export job failed',
      jobId,
      error: err.message
    });
  });
});

// Incremental Export Endpoint
app.post('/exports/incremental', async (req, res) => {
  const consumerId = req.headers['x-consumer-id'];
  if (!consumerId) {
    return res.status(400).json({ error: 'X-Consumer-ID header required' });
  }
  
  const jobId = uuidv4();
  logger.info({
    event: 'Export job started',
    jobId,
    consumerId,
    exportType: 'incremental'
  });
  
  res.status(202).json({
    jobId,
    status: 'started',
    exportType: 'incremental',
    outputFilename: `incremental_${consumerId}_${Date.now()}.csv`
  });
  
  handleIncrementalExport(pool, consumerId, jobId).catch(err => {
    logger.error({
      event: 'Export job failed',
      jobId,
      error: err.message
    });
  });
});

// Delta Export Endpoint
app.post('/exports/delta', async (req, res) => {
  const consumerId = req.headers['x-consumer-id'];
  if (!consumerId) {
    return res.status(400).json({ error: 'X-Consumer-ID header required' });
  }
  
  const jobId = uuidv4();
  logger.info({
    event: 'Export job started',
    jobId,
    consumerId,
    exportType: 'delta'
  });
  
  res.status(202).json({
    jobId,
    status: 'started',
    exportType: 'delta',
    outputFilename: `delta_${consumerId}_${Date.now()}.csv`
  });
  
  handleDeltaExport(pool, consumerId, jobId).catch(err => {
    logger.error({
      event: 'Export job failed',
      jobId,
      error: err.message
    });
  });
});

// Get Watermark Endpoint
app.get('/exports/watermark', async (req, res) => {
  const consumerId = req.headers['x-consumer-id'];
  if (!consumerId) {
    return res.status(400).json({ error: 'X-Consumer-ID header required' });
  }
  
  try {
    const watermark = await getWatermark(pool, consumerId);
    if (!watermark) {
      return res.status(404).json({ error: 'Watermark not found' });
    }
    res.status(200).json({
      consumerId,
      lastExportedAt: watermark
    });
  } catch (error) {
    logger.error({ event: 'Error fetching watermark', error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const start = async () => {
  try {
    await initializeDatabase(pool);
    
    app.listen(PORT, () => {
      logger.info({
        event: 'Server started',
        port: PORT,
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    logger.error({ event: 'Failed to start server', error: error.message });
    process.exit(1);
  }
};

start();
