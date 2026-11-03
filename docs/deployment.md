# MarketHub Deployment Readiness & Operations Guide

## 1. Production Architecture Overview

In production, MarketHub is deployed as a high-availability monorepo or containerized microservices:

```text
               ┌───────────────────────┐
               │  Nginx Reverse Proxy  │
               │      (SSL / TLS)      │
               └───────────┬───────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
  ┌─────────────────────┐     ┌─────────────────────┐
  │  Vite Client (SPA)  │     │ Express API Backend │
  │ Static Assets (CDN) │     │    (PM2 Cluster)    │
  └─────────────────────┘     └──────────┬──────────┘
                                         │
              ┌──────────────────────────┼─────────────────────────┐
              ▼                          ▼                         ▼
   ┌──────────────────────┐   ┌──────────────────────┐  ┌──────────────────────┐
   │ Managed PostgreSQL   │   │ Managed Redis        │  │ Managed Elasticsearch│
   │ (AWS RDS / Supabase) │   │ (AWS ElastiCache)    │  │ (Elastic Cloud / Aos)│
   └──────────────────────┘   └──────────────────────┘  └──────────────────────┘
```

---

## 2. Environment Variables Configuration

### Backend Production Configuration (`backend/.env`)
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://db_user:secure_password@db_host:5432/markethub_prod?sslmode=require
JWT_SECRET=generate_strong_64_char_hex_random_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=https://marketplace.yourdomain.com
ELASTICSEARCH_URL=https://elastic_host:9200
ELASTICSEARCH_INDEX=products_prod
REDIS_URL=rediss://default:secure_redis_password@redis_host:6379
CART_CACHE_TTL_SECONDS=1800
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=rzp_test_secret_placeholder
RAZORPAY_CURRENCY=INR
```

### Frontend Production Configuration (`frontend/.env`)
```env
VITE_API_URL=https://api.yourdomain.com
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## 3. Production Build Instructions

### 3.1 Client Build
```bash
npm run build --prefix frontend
```
The compiled output is outputted to `frontend/dist/` ready to be served via Nginx, Cloudflare Pages, AWS S3 / CloudFront, or Vercel.

### 3.2 Database Initialization & Migration
```bash
# Run schema and seed
npm run db:init
npm run db:seed
node backend/scripts/migrateStage9.js

# Populate Elasticsearch cluster index
npm run search:reindex
```

### 3.3 Starting with PM2 Process Manager
```bash
cd backend
pm2 start src/server.js --name markethub-api -i max
pm2 save
pm2 startup
```

---

## 4. Cloud Integration Roadmap

### 4.1 AWS S3 (Planned Production Enhancement)
> **Current Status**: Product images currently use image URLs. AWS S3 object storage is planned as a production/cloud deployment enhancement and is not enabled in the current development environment.

To configure AWS S3 for production file uploads:
1. Provision an S3 bucket with private read/write permissions.
2. Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
3. Configure `backend/.env` with `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.
4. Generate Presigned PUT URLs on the backend, allowing clients to upload binary image files directly to S3 without passing upload streams through Express servers.

### 4.2 Razorpay Live Processing
> **Current Status**: Payments are implemented using Razorpay Test Mode only. No live payment processing is enabled.

To enable live payments in production:
1. Complete Razorpay merchant KYC onboarding.
2. Generate Live API Keys in the Razorpay Dashboard.
3. Update `RAZORPAY_KEY_ID` to `rzp_live_...` and `RAZORPAY_KEY_SECRET` in `backend/.env`.
4. Enable webhook signing secret validation (`RAZORPAY_WEBHOOK_SECRET`) for asynchronous payment capture callbacks.

