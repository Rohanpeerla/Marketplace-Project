# MarketHub - Multi-Vendor E-Commerce Marketplace

An enterprise-grade full-stack multi-vendor marketplace platform built for high reliability, modular scalability, and modern developer experience.

MarketHub supports three core user roles:
- **Customer**: Browse products, vendor storefronts, add items to a unified cart, checkout, and track shipments.
- **Vendor**: Manage vendor profile, product catalog, inventory, order fulfillment, and analytics.
- **Admin**: Review vendor onboarding applications, mediate disputes, manage categories, and oversee system health.

---

## Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 8 | Fast, modern client SPA with instant HMR |
| **Styling** | Tailwind CSS v4 | Clean, responsive design system & utility styling |
| **Backend** | Node.js + Express.js | Modular RESTful API architecture |
| **Database** | PostgreSQL | Relational transactional database (12 core tables) |
| **Connection** | `pg` (node-postgres) | Connection pooling with graceful startup checks |

---

## Project Structure

```text
MultiVendorMarketplace/
├── frontend/
│   ├── public/
│   │   └── logo.svg                 # MarketHub brand icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation with live API health indicator
│   │   │   ├── Hero.jsx             # Hero section with role highlights & CTAs
│   │   │   ├── ProductSection.jsx   # Featured products with vendor tags & filters
│   │   │   ├── BackendStatusCard.jsx# Interactive CORS & database health verification
│   │   │   └── Footer.jsx           # Clean footer & system architecture summary
│   │   ├── App.jsx                  # Main application assembly & API polling
│   │   ├── App.css                  # Custom styling overrides
│   │   ├── index.css                # Tailwind CSS v4 entrypoint
│   │   └── main.jsx                 # React root mount
│   ├── .env.example                 # Example client environment variables
│   ├── .gitignore                   # Frontend ignored files (.env, dist, node_modules)
│   ├── index.html                   # HTML5 shell with Inter typography & metadata
│   ├── package.json                 # Frontend dependencies & scripts
│   └── vite.config.js               # Vite configuration with Tailwind CSS & proxy
│
├── backend/
│   ├── database/
│   │   ├── schema.sql               # PostgreSQL 12-table relational schema & indexes
│   │   ├── seed.sql                 # Seed accounts, vendors, products, and categories
│   │   ├── initDb.js                # Database initialization script (npm run db:init)
│   │   └── seedDb.js                # Database seeding script (npm run db:seed)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js               # Environment configuration loader
│   │   │   └── db.js                # PostgreSQL connection pool with health checks
│   │   ├── controllers/
│   │   │   └── healthController.js  # GET /api/health and /api/health/db controllers
│   │   ├── middleware/
│   │   │   └── errorHandler.js      # Centralized error handler and 404 router
│   │   ├── routes/
│   │   │   ├── healthRoutes.js      # Health endpoints routing (/health, /health/db)
│   │   │   └── index.js             # Route aggregator
│   │   ├── services/
│   │   │   └── index.js             # Placeholder for business logic services
│   │   ├── models/
│   │   │   └── index.js             # Placeholder for database models
│   │   ├── app.js                   # Express app with CORS & middleware setup
│   │   └── server.js                # Server entrypoint with graceful shutdown
│   ├── .env.example                 # Safe environment template without secrets
│   ├── .gitignore                   # Backend ignored files (.env, node_modules)
│   └── package.json                 # Backend dependencies (express, cors, dotenv, pg)
│
├── .gitignore                       # Root Git ignore rules
├── package.json                     # Monorepo root helper scripts
└── README.md                        # Documentation and run instructions
```

---

## Database Architecture (Stage 2)

### Table Overview

| # | Table | Purpose | Key Constraints & Relations |
| :--- | :--- | :--- | :--- |
| 1 | `users` | Accounts across all platform roles | UUID PK, UNIQUE `email`, `role` IN (`customer`, `vendor`, `admin`) |
| 2 | `vendors` | Vendor business profiles & onboarding status | UUID PK, UNIQUE FK `user_id` -> `users(id)`, `status` IN (`pending`, `approved`, `rejected`) |
| 3 | `categories` | Product classification taxonomy | UUID PK, UNIQUE `name` |
| 4 | `products` | Multi-vendor product catalog | UUID PK, FK `vendor_id`, FK `category_id`, `price >= 0`, `stock >= 0`, `status` IN (`active`, `inactive`) |
| 5 | `product_images` | Gallery images for products | UUID PK, FK `product_id` ON DELETE CASCADE, `is_primary` |
| 6 | `carts` | User shopping carts | UUID PK, UNIQUE FK `user_id` -> `users(id)` ON DELETE CASCADE |
| 7 | `cart_items` | Items held in user cart | UUID PK, FK `cart_id`, FK `product_id`, `quantity > 0`, UNIQUE (`cart_id`, `product_id`) |
| 8 | `orders` | Customer checkout orders | UUID PK, FK `user_id`, `payment_status`, `order_status`, `shipping_address` |
| 9 | `order_items` | Individual purchased order lines | UUID PK, FK `order_id`, FK `product_id`, FK `vendor_id`, historical `price`, `quantity > 0` |
| 10 | `payments` | Transaction records for Razorpay (foundation) | UUID PK, UNIQUE FK `order_id`, `amount >= 0`, `status` |
| 11 | `reviews` | Customer product reviews & ratings | UUID PK, FK `user_id`, FK `product_id`, `rating BETWEEN 1 AND 5`, UNIQUE (`user_id`, `product_id`) |
| 12 | `coupons` | Platform promotional discounts | UUID PK, UNIQUE `code`, `discount_type` IN (`percentage`, `fixed`), `discount_value > 0` |

### Key Indexes
- `users`: `email`, `role`
- `vendors`: `user_id`, `status`
- `products`: `vendor_id`, `category_id`, `status`, `name`
- `orders`: `user_id`, `order_status`, `payment_status`
- `order_items`: `order_id`, `vendor_id`, `product_id`
- `reviews`: `product_id`, `user_id`
- `coupons`: `code`

---

## PostgreSQL Setup Guide

### 1. Installation Requirements
- **PostgreSQL 14, 15, 16, or 17** installed locally (or via Docker).
  - Download official Windows installer from: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
  - Or run PostgreSQL via Docker:
    ```bash
    docker run --name markethub-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
    ```

### 2. Create the Database
In `psql` or pgAdmin / DBeaver, create the `markethub_db` database:
```sql
CREATE DATABASE markethub_db;
```

### 3. Configure `backend/.env`
Create or edit `backend/.env` (this file is gitignored and never committed):
```env
PORT=5000
NODE_ENV=development

# PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/markethub_db

JWT_SECRET=super_secret_dev_key_here
CLIENT_URL=http://localhost:5173
```
*(Replace `postgres:postgres` with your actual local PostgreSQL user and password).*

### 4. Run Schema Migration
Apply the database schema definitions using the safe init script:
```bash
# From workspace root
npm run db:init

# Or from backend directory
cd backend
npm run db:init
```
*(Alternatively, via psql: `psql -U postgres -d markethub_db -f backend/database/schema.sql`)*

### 5. Run Seed Data
Populate development accounts, categories, and products:
```bash
# From workspace root
npm run db:seed

# Or from backend directory
cd backend
npm run db:seed
```
*(Alternatively, via psql: `psql -U postgres -d markethub_db -f backend/database/seed.sql`)*

---

## Development Seed Accounts & Credentials

For local development and testing, all seed accounts use the default password: **`Password123!`** (stored safely as cost-10 bcrypt hashes: `$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW`):

| Role | Name | Email | Default Password |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@markethub.com` | `Password123!` |
| **Vendor 1** | Alex Turner (TechCraft Innovations) | `techcraft@markethub.com` | `Password123!` |
| **Vendor 2** | Sophia Chen (Aura Sound Labs) | `aurasound@markethub.com` | `Password123!` |
| **Customer 1** | John Doe | `john.doe@example.com` | `Password123!` |
| **Customer 2** | Emma Watson | `emma.watson@example.com` | `Password123!` |
| **Customer 3** | Michael Brown | `michael.brown@example.com` | `Password123!` |

---

## Health Check & Verification Endpoints

### 1. General API Health (`GET /api/health`)
Verifies Express server is running.
```json
{
  "success": true,
  "message": "MarketHub API is running",
  "timestamp": "2026-10-23T11:19:50.489Z",
  "uptime": 88.38,
  "environment": "development"
}
```

### 2. Database Health (`GET /api/health/db`)
Verifies active PostgreSQL connection without exposing credentials.

- **When Database is Connected:**
  ```json
  {
    "success": true,
    "database": "connected",
    "latencyMs": 2
  }
  ```

- **When Database is Offline / Pending Setup:**
  ```json
  {
    "success": false,
    "database": "disconnected",
    "message": "Database is unavailable. Please verify PostgreSQL connection."
  }
  ```

---

## Running the Application

### Option A: Concurrent Running
#### Terminal 1: Backend API
```bash
cd backend
npm run dev
```

#### Terminal 2: Frontend Client
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
