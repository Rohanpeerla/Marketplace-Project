# MarketHub - Multi-Vendor E-Commerce Marketplace

An enterprise-grade full-stack multi-vendor marketplace platform built for high reliability, modular scalability, and modern developer experience.

MarketHub supports three core user roles:
- **Customer**: Browse products, search and filter via Elasticsearch, view vendor storefronts, add items to cart, checkout, and track shipments.
- **Vendor**: Manage vendor profile, product catalog, inventory, product images, order fulfillment, and analytics.
- **Admin**: Review vendor onboarding applications, mediate disputes, manage product categories, and oversee system health.

---

## Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 8 | Fast, modern client SPA with instant HMR |
| **Styling** | Tailwind CSS v4 | Clean, responsive design system & utility styling |
| **Backend** | Node.js + Express.js | Modular RESTful API architecture |
| **Database** | PostgreSQL 16 | Relational transactional database (12 core tables) |
| **Connection** | `pg` (node-postgres) | Connection pooling with graceful startup checks |
| **Search Engine** | Elasticsearch 7.17 | High-performance full-text search, filtering, and sorting |
| **Authentication** | JWT + bcryptjs | Secure password hashing & role-based access control (RBAC) |

---

## Project Structure

```text
MultiVendorMarketplace/
├── frontend/
│   ├── public/
│   │   └── logo.svg                 # MarketHub brand icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation with live API health indicator & auth status
│   │   │   ├── Hero.jsx             # Hero section with role highlights & CTAs
│   │   │   ├── ProductSection.jsx   # Elasticsearch product catalog with search, filters, sort & pagination
│   │   │   ├── BackendStatusCard.jsx# Interactive CORS, DB & search engine health verification
│   │   │   ├── AuthModal.jsx        # Login & registration modal with role switching
│   │   │   ├── VendorDashboardModal.jsx # Vendor product & profile management modal
│   │   │   ├── AdminCategoryModal.jsx   # Admin category management modal
│   │   │   └── Footer.jsx           # Clean footer & system architecture summary
│   │   ├── services/
│   │   │   └── api.js               # Centralized API service (auth, vendors, categories, products, search)
│   │   ├── App.jsx                  # Main application assembly & state management
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
│   ├── scripts/
│   │   ├── verifyAuth.js            # Stage 3 Auth & RBAC verification test suite
│   │   ├── verifyStage4.js          # Stage 4 Vendor & Product verification test suite
│   │   ├── verifyStage5.js          # Stage 5 Elasticsearch Search verification test suite
│   │   └── reindexProducts.js       # Bulk Elasticsearch reindexing script (npm run search:reindex)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js               # Validated environment variables (port, db, jwt, elasticsearch)
│   │   │   ├── db.js                # PostgreSQL connection pool with health checks
│   │   │   └── elasticsearch.js     # Elasticsearch client connection & cluster health checks
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register, login, profile (/api/auth)
│   │   │   ├── vendorController.js  # Vendor profile & vendor directory (/api/vendors)
│   │   │   ├── categoryController.js# Category management (/api/categories)
│   │   │   ├── productController.js # Product CRUD & image management (/api/products)
│   │   │   ├── searchController.js  # Elasticsearch product search & filter (/api/search/products)
│   │   │   └── healthController.js  # GET /api/health, /api/health/db, /api/health/search
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # JWT verification & RBAC role guards (requireRole)
│   │   │   └── errorHandler.js      # Centralized error handler and 404 router
│   │   ├── models/
│   │   │   ├── userModel.js         # User PostgreSQL model
│   │   │   ├── vendorModel.js       # Vendor PostgreSQL model
│   │   │   ├── categoryModel.js     # Category PostgreSQL model
│   │   │   ├── productModel.js      # Product PostgreSQL model
│   │   │   ├── productImageModel.js # Product Image PostgreSQL model
│   │   │   └── index.js             # Models export hub
│   │   ├── services/
│   │   │   ├── authService.js       # Authentication & JWT issuance logic
│   │   │   ├── vendorService.js     # Vendor profile business logic
│   │   │   ├── categoryService.js   # Category management logic
│   │   │   ├── productService.js    # Product lifecycle & sync orchestration logic
│   │   │   ├── searchService.js     # Elasticsearch indexing, bulk sync & search engine
│   │   │   └── index.js             # Services export hub
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # Auth routes
│   │   │   ├── vendorRoutes.js      # Vendor profile routes
│   │   │   ├── categoryRoutes.js    # Category taxonomy routes
│   │   │   ├── productRoutes.js     # Product catalog routes
│   │   │   ├── searchRoutes.js      # Search engine routes (/api/search/products)
│   │   │   ├── healthRoutes.js      # Health endpoints (/health, /health/db, /health/search)
│   │   │   └── index.js             # Primary API router
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # Server entrypoint with DB & ES checks
│   ├── .env.example                 # Safe environment template without secrets
│   ├── .gitignore                   # Backend ignored files (.env, node_modules)
│   └── package.json                 # Backend dependencies & npm scripts
│
├── .gitignore                       # Root Git ignore rules
├── package.json                     # Monorepo root helper scripts
└── README.md                        # Documentation and run instructions
```

---

## Search Engine Architecture (Stage 5)

MarketHub uses **Elasticsearch** alongside PostgreSQL to deliver real-time, low-latency search and faceted filtering.

### Key Principles
1. **PostgreSQL is the Source of Truth**: All transactional writes (creates, updates, deletes) persist directly to PostgreSQL.
2. **Elasticsearch is the Search Layer**: Read-heavy customer catalog searches, filters, and sorts run against Elasticsearch with sub-50ms latency.
3. **Resilient Synchronization**: When products or images are modified in PostgreSQL, asynchronous updates synchronize to Elasticsearch. If the search cluster is temporarily offline or degraded, PostgreSQL operations continue without rollback or failure.

### Schema Mapping (`products` Index)
- `id`: `keyword`
- `name`: `text` (analyzed with `standard`, lowercase, asciifolding) + `fields.keyword` (for alphabetical sorting)
- `description`: `text`
- `price`: `float`
- `stock`: `integer`
- `status`: `keyword` (`active`, `inactive`)
- `category_id`: `keyword`
- `category_name`: `text` + `fields.keyword`
- `vendor_id`: `keyword`
- `vendor_name`: `text` + `fields.keyword`
- `images`: `object` array (`id`, `image_url`, `is_primary`)
- `primary_image`: `keyword`
- `created_at`: `date`
- `updated_at`: `date`

### Search Features Supported
- **Full-Text Search (`q`)**: Searches `name^3` (boosted x3 for relevance), `description`, `category_name`, and `vendor_name` with typo-tolerant fuzzy matching (`fuzziness: 'AUTO'`).
- **Faceted Filters**: `category_id`, `vendor_id`, `min_price`, `max_price`.
- **Sorting Options (`sort`)**:
  - `relevance` (default score-based ranking)
  - `price_asc` (Price: Low to High)
  - `price_desc` (Price: High to Low)
  - `name_asc` (Name: A to Z)
  - `name_desc` (Name: Z to A)
- **Pagination (`page`, `limit`)**: Returns `products` alongside metadata (`total`, `page`, `limit`, `totalPages`).

---

## API Endpoints

### 1. Health Checks
- `GET /api/health` - API server status and uptime
- `GET /api/health/db` - PostgreSQL database connectivity status
- `GET /api/health/search` - Elasticsearch cluster health, version, and latency

### 2. Search & Catalog (Stage 5)
- `GET /api/search/products` - Search and filter products using Elasticsearch
  - Query params: `q`, `category_id`, `vendor_id`, `min_price`, `max_price`, `sort`, `page`, `limit`

### 3. Authentication & RBAC (Stage 3)
- `POST /api/auth/register` - Register customer or vendor account
- `POST /api/auth/login` - Authenticate user and receive JWT
- `GET /api/auth/me` - Retrieve current user session and vendor profile

### 4. Vendor & Product Management (Stage 4)
- `GET /api/vendors/me` - Authenticated vendor profile
- `PUT /api/vendors/me` - Update vendor business details
- `GET /api/vendors` - Public approved vendor list
- `GET /api/categories` - List categories with product counts
- `POST /api/categories` - Create category (Admin only)
- `PUT /api/categories/:id` - Update category (Admin only)
- `DELETE /api/categories/:id` - Delete category (Admin only)
- `GET /api/products` - Direct database product query with pagination
- `GET /api/products/:id` - Product details with images and vendor info
- `POST /api/products` - Create product (Approved Vendor or Admin)
- `PUT /api/products/:id` - Update product (Owner Vendor or Admin)
- `DELETE /api/products/:id` - Soft delete product (Owner Vendor or Admin)
- `POST /api/products/:id/images` - Add product image
- `DELETE /api/products/:id/images/:imageId` - Remove product image

---

## CLI Scripts & Verification

### Bulk Reindexing
To synchronize all PostgreSQL products into Elasticsearch:
```bash
npm run search:reindex
```

### Running Automated Test Suites
Run all automated test suites (Stage 3 Auth + Stage 4 Products/Vendors + Stage 5 Elasticsearch):
```bash
npm test
```

Or run individual suites:
```bash
npm run test:auth    # Stage 3 Auth & RBAC (25 tests)
npm run test:stage4  # Stage 4 Vendor & Product CRUD (39 tests)
npm run test:stage5  # Stage 5 Elasticsearch Search & Sync (42 tests)
```

---

## Running the Application Locally

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 16 listening on `localhost:5432`
- Elasticsearch 7.17+ listening on `localhost:9200`

### 2. Environment Setup
Copy and configure `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/markethub_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=products
```

### 3. Database Initialization & Search Indexing
```bash
npm run db:init
npm run db:seed
npm run search:reindex
```

### 4. Start the Application
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
