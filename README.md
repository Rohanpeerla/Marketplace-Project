# MarketHub - Multi-Vendor E-Commerce Marketplace

An enterprise-grade full-stack multi-vendor marketplace platform built for high reliability, modular scalability, and modern developer experience.

MarketHub supports three core user roles:
- **Customer**: Browse products, search and filter via Elasticsearch, view vendor storefronts, add items from multiple vendors to a Redis-cached shopping cart, manage cart quantities, apply discount coupons, complete Razorpay test payments, download PDF invoices, and write purchase-verified product reviews.
- **Vendor**: Manage vendor profile, product catalog, inventory, product images, track order fulfillment, update order statuses, and view merchant performance metrics.
- **Admin**: Review vendor applications, manage categories, oversee platform orders, moderate product reviews, manage coupon campaigns, and monitor business analytics via the Admin Analytics Dashboard.

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
| **Invoicing** | PDFKit | High-fidelity server-side PDF invoice generation |
| **Payments** | Razorpay SDK (Test Mode) | Secure test mode payment order creation & cryptographic signature verification |
| **Authentication** | JWT + bcryptjs | Secure password hashing & role-based access control (RBAC) |

> **Note on AWS S3**: Real AWS S3 storage integration is pending from earlier Step 3 requirements and will be configured when an AWS account is provisioned. Currently, product images operate cleanly with resilient URI strings.

---

## Project Structure

```text
MultiVendorMarketplace/
├── frontend/
│   ├── public/
│   │   └── logo.svg                 # MarketHub brand icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation with live API health, role badges & cart/analytics links
│   │   │   ├── Hero.jsx             # Hero section with role highlights & CTAs
│   │   │   ├── ProductSection.jsx   # Elasticsearch product catalog with search, filters, sort & ratings
│   │   │   ├── BackendStatusCard.jsx# Interactive CORS, DB & Redis health verification
│   │   │   ├── AuthModal.jsx        # Login & registration modal with role switching
│   │   │   ├── CartModal.jsx        # Shopping cart modal with item controls, vendor tags & subtotals
│   │   │   ├── CheckoutModal.jsx    # Checkout with coupon validation & Razorpay test mode payment
│   │   │   ├── OrderHistoryModal.jsx# Customer order tracking, cancellation & PDF invoice download
│   │   │   ├── ProductDetailModal.jsx # Detail modal with stock badges & purchase-verified review system
│   │   │   ├── AdminAnalyticsModal.jsx # Admin dashboard with KPIs, revenue history & vendor leaderboards
│   │   │   ├── VendorDashboardModal.jsx # Vendor product & order management modal
│   │   │   ├── AdminCategoryModal.jsx   # Admin category management modal
│   │   │   ├── AdminOrdersModal.jsx     # Admin platform order monitor modal
│   │   │   └── Footer.jsx           # Clean footer & system architecture summary
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Authentication session & profile context
│   │   │   └── CartContext.jsx      # Shopping cart state, optimistic updates & live count
│   │   ├── services/
│   │   │   └── api.js               # Centralized API service (auth, products, cart, orders, reviews, coupons, analytics, invoices)
│   │   ├── App.jsx                  # Main application assembly & state management
│   │   ├── index.css                # Tailwind CSS v4 entrypoint
│   │   └── main.jsx                 # React root mount
│   ├── .env.example                 # Example client environment variables (VITE_API_URL)
│   ├── package.json                 # Frontend dependencies & scripts
│   └── vite.config.js               # Vite configuration with Tailwind CSS & proxy
│
├── backend/
│   ├── database/
│   │   ├── schema.sql               # PostgreSQL 12-table relational schema & indexes
│   │   ├── seed.sql                 # Seed accounts, vendors, products, categories, and coupons
│   │   ├── initDb.js                # Database initialization script (npm run db:init)
│   │   └── seedDb.js                # Database seeding script (npm run db:seed)
│   ├── scripts/
│   │   ├── migrateStage9.js         # Stage 9 database migration (coupons, invoice numbers, reviews)
│   │   ├── verifyAuth.js            # Stage 3 Auth & RBAC verification test suite
│   │   ├── verifyStage4.js          # Stage 4 Vendor & Product verification test suite
│   │   ├── verifyStage5.js          # Stage 5 Elasticsearch Search verification test suite
│   │   ├── verifyStage6.js          # Stage 6 Redis + Shopping Cart verification test suite
│   │   ├── verifyStage7.js          # Stage 7 Checkout & Order Management verification test suite
│   │   ├── verifyStage8.js          # Stage 8 Razorpay Test Mode Payment verification test suite
│   │   ├── verifyStage9.js          # Stage 9 Reviews, Coupons, Invoices & Analytics verification test suite
│   │   └── reindexProducts.js       # Bulk Elasticsearch reindexing script (npm run search:reindex)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js               # Validated environment variables
│   │   │   ├── db.js                # PostgreSQL connection pool with health checks
│   │   │   ├── elasticsearch.js     # Elasticsearch client connection
│   │   │   ├── redis.js             # Reusable Redis service with soft-failure fallback
│   │   │   └── razorpay.js          # Razorpay Test Mode SDK client & HMAC verifier
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register, login, profile (/api/auth)
│   │   │   ├── cartController.js    # Cart operations (/api/cart)
│   │   │   ├── orderController.js   # Customer checkout, cancellation & invoice download (/api/orders)
│   │   │   ├── paymentController.js # Razorpay test mode payment creation & signature verification (/api/payments)
│   │   │   ├── reviewController.js  # Product reviews & rating aggregates (/api/reviews)
│   │   │   ├── couponController.js  # Coupon validation & admin management (/api/coupons)
│   │   │   ├── adminAnalyticsController.js # Admin analytics KPIs & trends (/api/admin/analytics)
│   │   │   ├── vendorOrderController.js # Vendor order management (/api/vendor/orders)
│   │   │   ├── adminOrderController.js  # Admin order overview (/api/admin/orders)
│   │   │   ├── vendorController.js  # Vendor profile & directory (/api/vendors)
│   │   │   ├── categoryController.js# Category taxonomy (/api/categories)
│   │   │   ├── productController.js # Product CRUD (/api/products)
│   │   │   ├── searchController.js  # Elasticsearch product search (/api/search/products)
│   │   │   └── healthController.js  # System health endpoints (/api/health/*)
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # JWT verification & RBAC role guards (requireRole)
│   │   │   └── errorHandler.js      # Centralized error handler and 404 router
│   │   ├── models/
│   │   │   ├── userModel.js         # User PostgreSQL model
│   │   │   ├── vendorModel.js       # Vendor PostgreSQL model
│   │   │   ├── categoryModel.js     # Category PostgreSQL model
│   │   │   ├── productModel.js      # Product PostgreSQL model
│   │   │   ├── productImageModel.js # Product Image PostgreSQL model
│   │   │   ├── cartModel.js         # Cart persistence PostgreSQL model
│   │   │   ├── orderModel.js        # Orders & OrderItems transactional PostgreSQL model
│   │   │   ├── paymentModel.js      # Payment records PostgreSQL model
│   │   │   ├── reviewModel.js       # Product reviews & rating aggregates model
│   │   │   ├── couponModel.js       # Coupons model with usage tracking
│   │   │   ├── analyticsModel.js    # SQL aggregated platform analytics model
│   │   │   └── index.js             # Models export hub
│   │   ├── services/
│   │   │   ├── authService.js       # Authentication & JWT issuance
│   │   │   ├── cartService.js       # Redis cache-aside cart management
│   │   │   ├── orderService.js      # Multi-vendor checkout & inventory management
│   │   │   ├── paymentService.js    # Razorpay test mode order creation & verification
│   │   │   ├── reviewService.js     # Review authorization & verified purchase enforcement
│   │   │   ├── couponService.js     # Coupon discount math & validation
│   │   │   ├── invoiceService.js    # PDFKit PDF tax invoice generator
│   │   │   ├── analyticsService.js  # Analytics data aggregation
│   │   │   ├── vendorService.js     # Vendor profile logic
│   │   │   ├── categoryService.js   # Category management logic
│   │   │   ├── productService.js    # Product lifecycle & sync orchestration logic
│   │   │   ├── searchService.js     # Elasticsearch search engine
│   │   │   └── index.js             # Services export hub
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # Auth routes (/api/auth)
│   │   │   ├── cartRoutes.js        # Cart routes (/api/cart)
│   │   │   ├── orderRoutes.js       # Customer orders & invoices (/api/orders)
│   │   │   ├── paymentRoutes.js     # Razorpay payments (/api/payments)
│   │   │   ├── reviewRoutes.js      # Reviews (/api/reviews)
│   │   │   ├── couponRoutes.js      # Coupons (/api/coupons)
│   │   │   ├── adminAnalyticsRoutes.js # Admin analytics (/api/admin/analytics)
│   │   │   ├── vendorOrderRoutes.js # Vendor orders (/api/vendor/orders)
│   │   │   ├── adminOrderRoutes.js  # Admin orders (/api/admin/orders)
│   │   │   ├── vendorRoutes.js      # Vendor directory (/api/vendors)
│   │   │   ├── categoryRoutes.js    # Category routes (/api/categories)
│   │   │   ├── productRoutes.js     # Product routes (/api/products)
│   │   │   ├── searchRoutes.js      # Search routes (/api/search/products)
│   │   │   ├── healthRoutes.js      # Health endpoints (/api/health)
│   │   │   └── index.js             # Main router
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # Server entrypoint with DB, ES & Redis checks
│   ├── .env.example                 # Safe environment template without secrets
│   └── package.json                 # Backend dependencies & npm scripts
│
├── .gitignore                       # Root Git ignore rules
├── package.json                     # Monorepo root helper scripts
└── README.md                        # Documentation and run instructions
```

---

## API Endpoints

### 1. Product Reviews (Stage 9)
- `GET /api/products/:productId/reviews` - Public list of product reviews with rating breakdown and average rating
- `POST /api/reviews` - Submit review (`{ productId, rating, comment }`) — strictly requires verified purchaser
- `PUT /api/reviews/:id` - Update review rating and comment (Review owner only)
- `DELETE /api/reviews/:id` - Delete review (Review owner or Admin moderation)

### 2. Coupons & Discounts (Stage 9)
- `POST /api/coupons/validate` - Validate coupon for an order amount (`{ code, orderAmount }`)
- `GET /api/coupons` - List all coupons (Admin only)
- `POST /api/coupons` - Create new percentage or fixed coupon (Admin only)
- `PUT /api/coupons/:id` - Update coupon details (Admin only)
- `DELETE /api/coupons/:id` - Delete coupon (Admin only)

### 3. PDF Invoices (Stage 9)
- `GET /api/orders/:id/invoice` - Download formatted PDF invoice (`INV-YYYY-XXXXXX`) for an order (Customer owner or Admin)

### 4. Admin Analytics Dashboard (Stage 9)
- `GET /api/admin/analytics/overview` - Platform KPIs (Gross Revenue, Total Orders, Active Vendors, Active Products, Avg Order Value)
- `GET /api/admin/analytics/revenue` - Monthly revenue history & payment method breakdowns
- `GET /api/admin/analytics/orders` - Order status distribution, fulfillment rate & cancellation rate
- `GET /api/admin/analytics/products` - Top selling products by units & low stock inventory alerts (stock ≤ 5)
- `GET /api/admin/analytics/vendors` - Vendor leaderboard by gross GMV and order counts

### 5. Razorpay Test Mode Payments (Stage 8)
- `POST /api/payments/create-order` - Create Razorpay test payment order (`{ orderIds: [...] }`)
- `POST /api/payments/verify` - Cryptographically verify HMAC SHA-256 signature
- `POST /api/payments/fail` - Record payment dismissal or failure
- `GET /api/payments/order/:orderId` - Retrieve payment record for an order
- `GET /api/payments/config` - Retrieve public frontend Razorpay configuration (`{ keyId, currency, mode: 'test' }`)

### 6. Checkout & Order Management (Stage 7)
- `POST /api/orders/checkout` - Atomic multi-vendor checkout with coupon support (`{ shippingAddress, city, state, postalCode, phone, couponCode }`)
- `GET /api/orders` - Customer order history with pagination & status filtering
- `GET /api/orders/:id` - Customer order detail (verified customer ownership)
- `PUT /api/orders/:id/cancel` - Cancel order (`pending`, `placed`, `confirmed`), restores stock atomically
- `GET /api/vendor/orders` - Vendor's isolated incoming orders
- `GET /api/vendor/orders/:id` - Vendor order detail (verified vendor ownership)
- `PUT /api/vendor/orders/:id/status` - Vendor updates order status (`{ status }`) adhering to valid transition lifecycle
- `GET /api/admin/orders` - Platform-wide order list across all vendors (Admin only)
- `GET /api/admin/orders/:id` - Platform order detail with full customer & vendor metadata (Admin only)

### 7. Shopping Cart (Stage 6)
- `GET /api/cart` - Retrieve current customer's cart (Redis cache-aside)
- `POST /api/cart/items` - Add product to cart (`{ productId, quantity }`)
- `PUT /api/cart/items/:productId` - Update item quantity (`{ quantity }`)
- `DELETE /api/cart/items/:productId` - Remove single product from cart
- `DELETE /api/cart` - Clear entire cart

### 8. Search & Catalog (Stage 5)
- `GET /api/search/products` - Search and filter products using Elasticsearch
  - Query params: `q`, `category_id`, `vendor_id`, `min_price`, `max_price`, `sort`, `page`, `limit`

### 9. Authentication & RBAC (Stage 3)
- `POST /api/auth/register` - Register customer or vendor account
- `POST /api/auth/login` - Authenticate user and receive JWT
- `GET /api/auth/me` - Retrieve current user session and vendor profile

### 10. Vendor & Product Management (Stage 4)
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

MarketHub features a 100% automated test suite with **332 tests** passing across all stages:

```bash
# Run the complete regression test suite (Stages 3 to 9)
npm test
```

Or run individual stage suites:
```bash
npm run test:auth    # Stage 3 Auth & RBAC (25 tests)
npm run test:stage4  # Stage 4 Vendor & Product CRUD (39 tests)
npm run test:stage5  # Stage 5 Elasticsearch Search & Sync (42 tests)
npm run test:stage6  # Stage 6 Redis + Shopping Cart (56 tests)
npm run test:stage7  # Stage 7 Checkout & Order Management (70 tests)
npm run test:stage8  # Stage 8 Razorpay Test Mode Payments (67 tests)
npm run test:stage9  # Stage 9 Reviews, Coupons, Invoices & Analytics (33 tests)
```

---

## Running the Application Locally

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 16 listening on `localhost:5432` (`markethub_db`)
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
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=rzp_test_secret_placeholder
RAZORPAY_CURRENCY=INR
```

Configure `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Database Initialization, Migration & Search Indexing
```bash
npm run db:init
npm run db:seed
node backend/scripts/migrateStage9.js
npm run search:reindex
```

### 4. Start the Application
#### Terminal 1: Backend API
```bash
npm run dev:backend
```

#### Terminal 2: Frontend Client
```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
