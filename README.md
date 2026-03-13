# Production-Ready Incremental Export System with Change Data Capture (CDC)

A containerized backend service that exports user data using Change Data Capture (CDC) principles with watermarking for incremental and delta exports.

## Project Overview

This system provides REST APIs for exporting user data in multiple formats:
- **Full Export**: Export all non-deleted users
- **Incremental Export**: Export only changed records since last export
- **Delta Export**: Export changes with operation metadata (INSERT, UPDATE, DELETE)
- **Watermark Tracking**: Monitor export progress per consumer

## Architecture

### Components
- **Backend API**: Node.js/Express (or your chosen framework)
- **Database**: PostgreSQL
- **Container Runtime**: Docker & Docker Compose
- **Export Storage**: Volume-mounted `./output` directory

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_users_updated_at ON users(updated_at);
```

#### Watermarks Table
```sql
CREATE TABLE watermarks (
  id SERIAL PRIMARY KEY,
  consumer_id VARCHAR(255) NOT NULL UNIQUE,
  last_exported_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

## Setup and Running

### Prerequisites
- Docker & Docker Compose
- 100GB+ disk space (for large exports)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Build-a-Production-Ready-Incremental-Export-System-with-Change-Data-Capture-CDC-
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up --build
   ```

4. **Verify health**
   ```bash
   curl http://localhost:8080/health
   ```

### Database Initialization

The database automatically seeds with 100,000+ records on first startup. The seeding process is idempotent and runs in the container.

## API Endpoints

### Health Check
```
GET /health
Response: { "status": "ok", "timestamp": "<ISO 8601>" }
```

### Full Export
```
POST /exports/full
Headers: X-Consumer-ID: consumer-1
Response: { "jobId": "<id>", "status": "started", "exportType": "full", "outputFilename": "<filename>" }
```

### Incremental Export
```
POST /exports/incremental
Headers: X-Consumer-ID: consumer-1
Response: { "jobId": "<id>", "status": "started", "exportType": "incremental", "outputFilename": "<filename>" }
```

### Delta Export
```
POST /exports/delta
Headers: X-Consumer-ID: consumer-1
Response: { "jobId": "<id>", "status": "started", "exportType": "delta", "outputFilename": "<filename>" }
```

### Get Watermark
```
GET /exports/watermark
Headers: X-Consumer-ID: consumer-1
Response: { "consumerId": "consumer-1", "lastExportedAt": "<ISO 8601>" }
```

## Testing

### Run Tests
```bash
docker-compose exec app npm test
```

### Test Coverage
Generate coverage report:
```bash
docker-compose exec app npm run test:coverage
```

Minimum required coverage: **70%**

## Logging

The system produces structured JSON logs for:
- Export job started
- Export job completed
- Export job failed

View logs:
```bash
docker-compose logs app
```

## Performance Considerations

### Indexing
- Index on `users(updated_at)` for fast watermark queries
- Index on `watermarks(consumer_id)` for quick lookups

### Concurrency
- Each consumer has independent watermark tracking
- Multiple export jobs can run concurrently
- Consumer ID header (`X-Consumer-ID`) identifies the consumer

### Scalability
- Asynchronous export jobs prevent API timeouts
- Large exports are streamed to disk
- Database connection pooling handles multiple consumers

## Deployment

### Docker Registry
```bash
# Build image
docker build -t myregistry/export-system:latest .

# Push to registry
docker push myregistry/export-system:latest
```

### Environment Variables
See `.env.example` for all available configuration options.

## Troubleshooting

### Database Connection Issues
Verify the database is healthy:
```bash
docker-compose exec db pg_isready -U user -d mydatabase
```

### Export Jobs Not Completing
Check logs for errors:
```bash
docker-compose logs app | grep "Export job failed"
```

### Performance Issues
Ensure indexes exist:
```bash
docker-compose exec db psql -U user -d mydatabase -c "SELECT * FROM pg_indexes WHERE tablename='users';"
```

## Contributing

Fork the repository and submit pull requests for any improvements.

## License

MIT License - See LICENSE file for details
