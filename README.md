# MarketHub - Multi-Vendor E-Commerce Marketplace

An enterprise-grade full-stack multi-vendor marketplace platform built for high reliability, modular scalability, and modern developer experience.

MarketHub supports three core user roles:
- **Customer**: Browse products, search and filter via Elasticsearch, view vendor storefronts, add items from multiple vendors to a Redis-cached shopping cart, and manage cart quantities.
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
| **Cache Layer** | Redis 5.0+ | Sub-millisecond shopping cart cache (`cart:{userId}`) |
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
│   │   │   ├── Navbar.jsx           # Top navigation with live API health indicator, role badges & Cart (X) count
│   │   │   ├── Hero.jsx             # Hero section with role highlights & CTAs
│   │   │   ├── ProductSection.jsx   # Elasticsearch product catalog with search, filters, sort, pagination & Add to Cart
│   │   │   ├── BackendStatusCard.jsx# Interactive CORS, DB & Redis health verification
│   │   │   ├── AuthModal.jsx        # Login & registration modal with role switching
│   │   │   ├── CartModal.jsx        # Shopping cart modal with item controls, vendor tags, and subtotals
│   │   │   ├── ProductDetailModal.jsx # Product detail modal with quantity selector & Add to Cart
│   │   │   ├── VendorDashboardModal.jsx # Vendor product & profile management modal
│   │   │   ├── AdminCategoryModal.jsx   # Admin category management modal
│   │   │   └── Footer.jsx           # Clean footer & system architecture summary
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Authentication session & profile context
│   │   │   └── CartContext.jsx      # Shopping cart state, optimistic updates & live count
│   │   ├── services/
│   │   │   └── api.js               # Centralized API service (auth, vendors, categories, products, search, cart)
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
│   │   ├── verifyStage6.js          # Stage 6 Redis + Shopping Cart verification test suite
│   │   └── reindexProducts.js       # Bulk Elasticsearch reindexing script (npm run search:reindex)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js               # Validated environment variables (port, db, jwt, elasticsearch, redis)
│   │   │   ├── db.js                # PostgreSQL connection pool with health checks
│   │   │   ├── elasticsearch.js     # Elasticsearch client connection & cluster health checks
│   │   │   └── redis.js             # Reusable Redis service (cache-aside, soft-failure fallback)
│   │   ├── controllers/
│   │   ├── cartController.js        # Cart endpoints (/api/cart)
│   │   │   ├── authController.js    # Register, login, profile (/api/auth)
│   │   │   ├── vendorController.js  # Vendor profile & vendor directory (/api/vendors)
│   │   │   ├── categoryController.js# Category management (/api/categories)
│   │   │   ├── productController.js # Product CRUD & image management (/api/products)
│   │   │   ├── searchController.js  # Elasticsearch product search & filter (/api/search/products)
│   │   │   └── healthController.js  # GET /api/health, /api/health/db, /api/health/search, /api/health/redis
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # JWT verification & RBAC role guards (requireRole)
│   │   │   └── errorHandler.js      # Centralized error handler and 404 router
│   │   ├── models/
│   │   │   ├── cartModel.js         # PostgreSQL transactional Cart persistence
│   │   │   ├── userModel.js         # User PostgreSQL model
│   │   │   ├── vendorModel.js       # Vendor PostgreSQL model
│   │   │   ├── categoryModel.js     # Category PostgreSQL model
│   │   │   ├── productModel.js      # Product PostgreSQL model
│   │   │   ├── productImageModel.js # Product Image PostgreSQL model
│   │   │   └── index.js             # Models export hub
│   │   ├── services/
│   │   │   ├── cartService.js       # Cart business logic, cache-aside, multi-vendor totals, stock checks
│   │   │   ├── authService.js       # Authentication & JWT issuance logic
│   │   │   ├── vendorService.js     # Vendor profile business logic
│   │   │   ├── categoryService.js   # Category management logic
│   │   │   ├── productService.js    # Product lifecycle & sync orchestration logic
│   │   │   ├── searchService.js     # Elasticsearch indexing, bulk sync & search engine
│   │   │   └── index.js             # Services export hub
│   │   ├── routes/
│   │   │   ├── cartRoutes.js        # Protected customer cart routes (/api/cart)
│   │   │   ├── authRoutes.js        # Auth routes
│   │   │   ├── vendorRoutes.js      # Vendor profile routes
│   │   │   ├── categoryRoutes.js    # Category taxonomy routes
│   │   │   ├── productRoutes.js     # Product catalog routes
│   │   │   ├── searchRoutes.js      # Search engine routes (/api/search/products)
│   │   │   ├── healthRoutes.js      # Health endpoints (/health, /health/db, /health/search, /health/redis)
│   │   │   └── index.js             # Primary API router
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # Server entrypoint with DB, ES & Redis checks
│   ├── .env.example                 # Safe environment template without secrets
│   ├── .gitignore                   # Backend ignored files (.env, node_modules)
│   └── package.json                 # Backend dependencies & npm scripts
│
├── .gitignore                       # Root Git ignore rules
├── package.json                     # Monorepo root helper scripts
└── README.md                        # Documentation and run instructions
```

---

## Shopping Cart & Redis Cache Architecture (Stage 6)

MarketHub implements a high-performance **cache-aside shopping cart** backed by **PostgreSQL 16** and cached in **Redis 5.0+**:

### Key Architectural Principles
1. **PostgreSQL is the Source of Truth**: `carts` and `cart_items` tables durably store every cart item inside atomic database transactions (`BEGIN...COMMIT`).
2. **Redis Cache-Aside**: When a customer retrieves their cart (`GET /api/cart`), the response is served directly from Redis (`cart:{userId}`) with sub-millisecond retrieval latency. On cache miss, the cart is assembled from PostgreSQL, cached in Redis with a 30-minute TTL, and returned.
3. **Write-Through Invalidation**: Every cart mutation (`POST /api/cart/items`, `PUT /api/cart/items/:id`, `DELETE /api/cart/items/:id`, `DELETE /api/cart`) updates PostgreSQL first and immediately refreshes the Redis cache, eliminating stale data.
4. **Soft-Failure Resilience**: If Redis is offline or restarted, the cart feature automatically falls back to PostgreSQL. Mutations and reads succeed transparently, and the user's cart is fully preserved.
5. **Multi-Vendor Cart Support**: A customer can hold products from multiple independent vendors in a single unified cart with separate vendor attribution per item.
6. **Server-Enforced Stock & Price Security**: Product prices and available inventory are strictly queried from PostgreSQL at transaction time. Client-supplied prices are completely ignored, and requests exceeding current stock are rejected with `409 Conflict`.

### Redis Key Design
- **Format**: `cart:{userId}` (e.g. `cart:c8f1e944-77bf-4e63-8a32-9cb7e7bbdd8a`)
- **TTL**: 1800 seconds (30 minutes)
- **Serialization**: JSON stringified cart payload containing items, vendor information, quantity, stock, and computed subtotals.

---

## API Endpoints

### 1. Health Checks
- `GET /api/health` - API server status and uptime
- `GET /api/health/db` - PostgreSQL database connectivity status
- `GET /api/health/search` - Elasticsearch cluster health, version, and latency
- `GET /api/health/redis` - Redis cache connection health and latency

### 2. Razorpay Test Mode Payments (Stage 8)
- `POST /api/payments/create-order` - Create Razorpay payment order for customer order(s) (`{ orderIds: [...] }`)
- `POST /api/payments/verify` - Cryptographically verify HMAC SHA-256 signature (`{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`)
- `POST /api/payments/fail` - Record payment dismissal or failure (`{ razorpay_order_id, payment_id }`)
- `GET /api/payments/order/:orderId` - Retrieve payment record for an order
- `GET /api/payments/config` - Retrieve public frontend Razorpay configuration (`{ keyId, currency, mode: 'test' }`)

### 3. Checkout & Order Management (Stage 7)
- `POST /api/orders/checkout` - Atomic multi-vendor checkout (`{ shippingAddress, city, state, postalCode, phone }`)
- `GET /api/orders` - Customer order history with pagination & status filtering
- `GET /api/orders/:id` - Customer order detail (verified customer ownership)
- `PUT /api/orders/:id/cancel` - Cancel order (`pending`, `placed`, `confirmed`), restores stock atomically
- `GET /api/vendor/orders` - Vendor's isolated incoming orders
- `GET /api/vendor/orders/:id` - Vendor order detail (verified vendor ownership)
- `PUT /api/vendor/orders/:id/status` - Vendor updates order status (`{ status }`) adhering to valid transition lifecycle
- `GET /api/admin/orders` - Platform-wide order list across all vendors (Admin only)
- `GET /api/admin/orders/:id` - Platform order detail with full customer & vendor metadata (Admin only)

### 4. Shopping Cart (Stage 6)
- `GET /api/cart` - Retrieve current customer's cart (Redis cache-aside)
- `POST /api/cart/items` - Add product to cart (`{ productId, quantity }`)
- `PUT /api/cart/items/:productId` - Update item quantity (`{ quantity }`)
- `DELETE /api/cart/items/:productId` - Remove single product from cart
- `DELETE /api/cart` - Clear entire cart

### 5. Search & Catalog (Stage 5)
- `GET /api/search/products` - Search and filter products using Elasticsearch
  - Query params: `q`, `category_id`, `vendor_id`, `min_price`, `max_price`, `sort`, `page`, `limit`

### 6. Authentication & RBAC (Stage 3)
- `POST /api/auth/register` - Register customer or vendor account
- `POST /api/auth/login` - Authenticate user and receive JWT
- `GET /api/auth/me` - Retrieve current user session and vendor profile

### 7. Vendor & Product Management (Stage 4)
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

## Running Automated Test Suites

Run the complete 6-stage regression test suite (Stage 3 Auth + Stage 4 Products/Vendors + Stage 5 Elasticsearch + Stage 6 Redis/Cart + Stage 7 Checkout/Orders + Stage 8 Payments):
```bash
npm test
```

Or run individual suites:
```bash
npm run test:auth    # Stage 3 Auth & RBAC (25 tests)
npm run test:stage4  # Stage 4 Vendor & Product CRUD (39 tests)
npm run test:stage5  # Stage 5 Elasticsearch Search & Sync (42 tests)
npm run test:stage6  # Stage 6 Redis + Shopping Cart (56 tests)
npm run test:stage7  # Stage 7 Checkout & Order Management (70 tests)
npm run test:stage8  # Stage 8 Razorpay Test Mode Payments (67 tests)
```

---

## Running the Application Locally

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 16 listening on `localhost:5432`
- Elasticsearch 7.17+ listening on `localhost:9200`
- Redis 5.0+ listening on `localhost:6379`

### 2. Environment Setup
Configure `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/markethub_db
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=products
REDIS_URL=redis://localhost:6379
CART_CACHE_TTL_SECONDS=1800
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
