# MarketHub - Multi-Vendor E-Commerce Marketplace

An enterprise-grade full-stack multi-vendor marketplace platform built for high reliability, modular scalability, and modern developer experience.

MarketHub supports three core user roles:
- **Customer**: Browse products, search and filter via Elasticsearch, view vendor storefronts, add items from multiple vendors to a Redis-cached shopping cart, manage cart quantities, apply discount coupons, complete Razorpay test payments, download PDF invoices, and write purchase-verified product reviews.
- **Vendor**: Manage vendor profile, product catalog, inventory, product images, track order fulfillment, update order statuses, and view merchant performance metrics.
- **Admin**: Review vendor applications, manage categories, oversee platform orders, moderate product reviews, manage coupon campaigns, and monitor business analytics via the Admin Analytics Dashboard.

---

## 1. Main Features
- **JWT & Role-Based Access Control (RBAC)**: Secure customer, vendor, and admin separation with bcrypt password hashing.
- **Vendor Storefronts & Onboarding**: Independent merchant management, catalog autonomy, and admin approval workflows.
- **Elasticsearch Catalog Search**: Real-time full-text indexing, fuzzy queries, faceted filtering (category, price, vendor), and sorting.
- **Redis High-Performance Shopping Cart**: Cache-aside architecture (`cart:{userId}`) delivering sub-millisecond cart lookups with seamless PostgreSQL fallback.
- **Transactional Multi-Vendor Checkout**: Pessimistic stock locking (`SELECT ... FOR UPDATE`), atomic inventory reduction, and vendor-split order creation.
- **Razorpay Test Mode Integration**: Full cryptographic HMAC SHA-256 signature verification supporting official test keys and in-app test simulation.
- **Verified Purchase Reviews**: Server-enforced purchase history verification, 1–5 star ratings, and anti-duplicate review controls.
- **Promotional Coupon System**: Percentage and fixed discounts, minimum spend conditions, discount caps, and atomic usage counters.
- **Dynamic PDF Tax Invoices**: Automated PDFKit generation streaming formatted tax receipts with unique invoice IDs (`INV-YYYY-XXXXXX`).
- **Admin Analytics Dashboard**: High-level platform KPIs, monthly GMV trends, order distribution rates, low-stock alerts, and merchant leaderboards.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React + Vite | React 19, Vite 8 | Fast, modern client SPA with instant HMR |
| **Styling** | Tailwind CSS | v4.0 | Modern blue theme, responsive layouts & micro-interactions |
| **Backend** | Node.js + Express | Express 4.21 | Modular, layered RESTful API architecture |
| **Database** | PostgreSQL | 16 | Relational transactional source of truth (12 core tables) |
| **Search Engine** | Elasticsearch | 7.17 | Inverted-index full-text search, filtering, and sorting |
| **Caching Layer** | Redis | 5.0+ | In-memory shopping cart caching (`cart:{userId}`, TTL 1800s) |
| **Invoicing** | PDFKit | 0.20 | Dynamic server-side vector PDF generation |
| **Payments** | Razorpay SDK | 2.9 (Test Mode) | Test mode checkout creation & HMAC signature verification |
| **Auth & Security**| JWT + bcryptjs | JWT 9.0 | Stateless token authentication & password hashing |

---

## 3. Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend SPA (React 19 + Vite 8)               │
│                   Tailwind CSS v4 • Context API • Modals              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Express.js RESTful API Backend                      │
│        Centralized Routing • JWT & RBAC Middleware • Controllers      │
└───────┬──────────────┬───────────────┬────────────────┬───────────────┬┘
        │              │               │                │               │
        ▼              ▼               ▼                ▼               ▼
┌──────────────┐ ┌───────────┐ ┌───────────────┐ ┌────────────┐ ┌──────────────┐
│  PostgreSQL  │ │   Redis   │ │ Elasticsearch │ │  Razorpay  │ │    PDFKit    │
│  (Relational │ │  (Cache-  │ │ (Search Engine│ │ (Test Mode │ │ (Tax Invoice│
│   Source of  │ │   Aside   │ │  Inverted     │ │  Payments  │ │  Generator)  │
│    Truth)    │ │   Cart)   │ │    Index)     │ │  HMAC)     │ │              │
└──────────────┘ └───────────┘ └───────────────┘ └────────────┘ └──────────────┘
```

Detailed architectural specifications, workflows, and transaction designs are documented in [docs/architecture.md](docs/architecture.md).

---

## 4. User Roles & Permissions

1. **Customer**:
   - Register, login, manage profile.
   - Browse products, search with Elasticsearch, apply price/category filters.
   - Add items from multiple vendors to cart, adjust quantities, delete items.
   - Apply discount coupons and checkout atomically.
   - Pay using Razorpay Test Mode and receive instant confirmation.
   - View order history, track order status, and cancel eligible orders.
   - Download PDF tax invoices for any placed order.
   - Submit, edit, or delete ratings and reviews for verified purchased products.

2. **Vendor**:
   - Register vendor profile (business name, address, phone).
   - Create, edit, and soft-delete catalog products once approved.
   - Upload and manage product image galleries.
   - View vendor-isolated incoming orders and itemized line items.
   - Transition order status through valid lifecycle states (`placed` → `confirmed` → `shipped` → `delivered`).

3. **Admin**:
   - Platform governance: review and approve vendor onboarding requests.
   - Category management: create, edit, and delete marketplace categories.
   - Oversee all platform-wide orders across all merchants.
   - Moderate and remove inappropriate customer reviews.
   - Manage promotional coupons (percentage/fixed, caps, minimum spend, expiry dates).
   - Access comprehensive business intelligence via the Admin Analytics Dashboard.

---

## 5. Project Structure

```text
MultiVendorMarketplace/
├── frontend/
│   ├── public/
│   │   └── logo.svg                 # MarketHub brand mark
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation with live service status, role badges & cart
│   │   │   ├── Hero.jsx             # Hero section with role highlights & CTAs
│   │   │   ├── ProductSection.jsx   # Elasticsearch product catalog with search, filters, sort & ratings
│   │   │   ├── BackendStatusCard.jsx# Live DB, Redis & Elasticsearch health monitors
│   │   │   ├── AuthModal.jsx        # Login & registration modal with role switching
│   │   │   ├── CartModal.jsx        # Shopping cart modal with item controls & merchant tags
│   │   │   ├── CheckoutModal.jsx    # Checkout with coupon validation & Razorpay test mode payment
│   │   │   ├── OrderHistoryModal.jsx# Customer order tracking, cancellation & PDF invoice download
│   │   │   ├── ProductDetailModal.jsx # Detail modal with stock badges & verified review system
│   │   │   ├── AdminAnalyticsModal.jsx # Admin dashboard with KPIs, revenue history & leaderboards
│   │   │   ├── VendorDashboardModal.jsx # Vendor product & order management modal
│   │   │   ├── AdminCategoryModal.jsx   # Admin category management modal
│   │   │   ├── AdminOrdersModal.jsx     # Admin platform order monitor modal
│   │   │   └── Footer.jsx           # Clean footer & system architecture summary
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Authentication session & profile context
│   │   │   └── CartContext.jsx      # Shopping cart state, optimistic updates & live count
│   │   ├── services/
│   │   │   └── api.js               # Centralized API service client
│   │   ├── App.jsx                  # Main application assembly & state management
│   │   ├── index.css                # Tailwind CSS v4 entrypoint
│   │   └── main.jsx                 # React root mount
│   ├── .env.example                 # Example client environment variables
│   ├── package.json                 # Frontend dependencies & scripts
│   └── vite.config.js               # Vite configuration with Tailwind CSS
│
├── backend/
│   ├── database/
│   │   ├── schema.sql               # PostgreSQL 12-table relational schema & indexes
│   │   ├── seed.sql                 # Seed accounts, vendors, products, categories, and coupons
│   │   ├── initDb.js                # Database initialization script (npm run db:init)
│   │   └── seedDb.js                # Database seeding script (npm run db:seed)
│   ├── scripts/
│   │   ├── migrateStage9.js         # Stage 9 database migration (coupons, invoices, reviews)
│   │   ├── verifyAuth.js            # Stage 3 Auth & RBAC verification test suite
│   │   ├── verifyStage4.js          # Stage 4 Vendor & Product verification test suite
│   │   ├── verifyStage5.js          # Stage 5 Elasticsearch Search verification test suite
│   │   ├── verifyStage6.js          # Stage 6 Redis + Shopping Cart verification test suite
│   │   ├── verifyStage7.js          # Stage 7 Checkout & Order Management verification test suite
│   │   ├── verifyStage8.js          # Stage 8 Razorpay Test Mode Payment verification test suite
│   │   ├── verifyStage9.js          # Stage 9 Reviews, Coupons, Invoices & Analytics test suite
│   │   └── reindexProducts.js       # Bulk Elasticsearch reindexing script
│   ├── src/
│   │   ├── config/                  # Environment, DB pool, Redis, Elasticsearch & Razorpay setup
│   │   ├── controllers/             # Request handlers for all domain entities
│   │   ├── middleware/              # JWT authentication & role-based access control
│   │   ├── models/                  # Parameterized SQL query execution
│   │   ├── services/                # Business logic, transactions & cache orchestration
│   │   ├── routes/                  # Express API route declarations
│   │   ├── app.js                   # Express application setup
│   │   └── server.js                # Server entrypoint with connection verifications
│   ├── .env.example                 # Safe environment template without secrets
│   └── package.json                 # Backend dependencies & npm scripts
│
├── docs/
│   ├── architecture.md              # Detailed system architecture & workflow diagrams
│   ├── api.md                       # Comprehensive REST API reference
│   ├── database.md                  # Entity-relationship schema, indexes & transactions
│   ├── testing.md                   # 332-test automated regression suite report
│   └── deployment.md                # Production readiness, build & deployment guide
│
├── .gitignore                       # Root Git ignore rules (protects .env, node_modules, logs)
├── package.json                     # Monorepo root helper scripts
└── README.md                        # Documentation and run instructions
```

---

## 6. Database Overview

MarketHub uses **PostgreSQL 16** with 12 relational tables:
- `users`: Authentication records, password hashes, and user roles (`customer`, `vendor`, `admin`).
- `vendors`: Merchant business profiles linked 1:1 to user accounts.
- `categories`: Taxonomy tree for organizing products.
- `products`: Product catalog with stock levels, pricing, status, and vendor references.
- `product_images`: Product media galleries with primary image designation.
- `carts` & `cart_items`: Relational shopping cart persistence with quantities and product references.
- `orders`: Master order records with unique invoice numbers (`INV-YYYY-XXXXXX`), customer IDs, vendor IDs, and statuses.
- `order_items`: Line-item details capturing immutable historical price snapshots at time of purchase.
- `payments`: Razorpay transaction records, order mappings, gateway tokens, and verification statuses.
- `reviews`: Verified purchase customer reviews, ratings (1–5), and anti-duplicate constraints.
- `coupons`: Promotional discount rules, expiration timestamps, minimum spends, caps, and atomic usage counters.

Complete schema definitions and ER diagrams are available in [docs/database.md](docs/database.md).

---

## 7. Supporting Services Usage

### 7.1 Elasticsearch (Search Engine)
- Serves `GET /api/search/products`.
- Inverted index with multi-field mappings (`name.keyword`, `category_id`, `vendor_id`, `status`).
- Powers fuzzy full-text search, price range filtering (`min_price`, `max_price`), and relevance/price sorting.
- Automatically synchronized upon product creation, update, and soft deletion.

### 7.2 Redis (Shopping Cart Cache)
- Caches customer shopping carts under `cart:{userId}` with 1,800-second TTL.
- Eliminates database load during high-frequency cart inspection.
- Invalidated immediately upon cart mutations or successful checkout completion.
- Soft-degrades to PostgreSQL transparently if the Redis service becomes unreachable.

### 7.3 Razorpay Test Mode (Payments)
- **Payments are implemented using Razorpay Test Mode only. No live payment processing is enabled.**
- Supports two zero-risk test tiers:
  1. *Official SDK Popup*: Active when a test key (`rzp_test_...`) is configured in `backend/.env`.
  2. *In-App Cryptographic Simulator*: Active by default (zero-config), providing immediate HMAC SHA-256 test payment generation and signature verification without requiring a live or external account.

### 7.4 PDFKit (Invoicing)
- Serves `GET /api/orders/:id/invoice`.
- Generates professional vector PDF tax invoices dynamically in memory without disk pollution.
- Itemizes products, merchant details, applied coupon discounts, and tax summaries.

### 7.5 Reviews, Coupons & Analytics
- **Reviews**: Server strictly inspects `orders` and `order_items` tables to ensure the customer actually purchased and received the product before allowing a review.
- **Coupons**: Applies percentage or fixed discounts up to optional maximum caps, enforcing minimum order thresholds and atomic usage increments.
- **Admin Analytics**: Real-time aggregation of platform gross merchandise volume (GMV), daily sales velocity, order status rates, and merchant leaderboards.

---

## 8. Local Setup & Running Instructions

### 8.1 Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14+ (default: port `5432`, database: `markethub_db`)
- **Redis**: v5.0+ (default: port `6379`)
- **Elasticsearch**: v7.17+ (default: port `9200`)

### 8.2 Environment Configuration

**Backend (`backend/.env`)**:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/markethub_db
JWT_SECRET=your_jwt_development_secret_key_here
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

**Frontend (`frontend/.env`)**:
```env
VITE_API_URL=http://localhost:5000
VITE_API_BASE_URL=http://localhost:5000
```

### 8.3 Starting Background Infrastructure Services

**Running PostgreSQL (Port 5432)**:
Ensure PostgreSQL service is active and `markethub_db` is created.

**Running Redis (Port 6379)**:
```powershell
& "C:\Users\<user>\redis-5.0.14.1\redis-server.exe"
```

**Running Elasticsearch (Port 9200)**:
```powershell
& "C:\Users\<user>\elasticsearch-7.17.24\bin\elasticsearch.bat"
```

### 8.4 Database Initialization, Migration & Search Indexing
From the project root:
```bash
npm run db:init
npm run db:seed
node backend/scripts/migrateStage9.js
npm run search:reindex
```

### 8.5 Running Backend & Frontend

**Terminal 1 — Backend API Server (Port 5000)**:
```bash
npm run dev:backend
```

**Terminal 2 — Frontend Development Client (Port 5173)**:
```bash
npm run dev:frontend
```

Open your browser at `http://localhost:5173`.

---

## 9. Seed Test Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@markethub.com` | `AdminPass123!` | Full platform access, category CRUD, reviews, coupons, analytics |
| **Vendor 1** | `techcraft@markethub.com`| `VendorPass123!` | TechCraft Innovations merchant dashboard, products & orders |
| **Vendor 2** | `aurasound@markethub.com`| `VendorPass123!` | Aura Sound Labs merchant dashboard, products & orders |
| **Customer** | `john.doe@example.com` | `CustomerPass123!` | Standard customer browsing, cart, checkout, payments & reviews |

---

## 10. Automated Testing & Verification

The project includes **332 automated tests** across 7 stage verification suites.

```bash
# Run complete test suite (Stages 3 through 9)
npm test
```

Or run individual verification scripts:
```bash
npm run test:auth    # Stage 3 Auth & RBAC (25 tests)
npm run test:stage4  # Stage 4 Vendor & Product CRUD (39 tests)
npm run test:stage5  # Stage 5 Elasticsearch Search & Sync (42 tests)
npm run test:stage6  # Stage 6 Redis Shopping Cart (56 tests)
npm run test:stage7  # Stage 7 Checkout & Order Management (70 tests)
npm run test:stage8  # Stage 8 Razorpay Test Mode Payments (67 tests)
npm run test:stage9  # Stage 9 Reviews, Coupons, Invoices & Analytics (33 tests)
```

Detailed test coverage documentation is available in [docs/testing.md](docs/testing.md).

---

## 11. Production Build

To build the client SPA for production:
```bash
npm run build --prefix frontend
```
The optimized bundle is generated in `frontend/dist/` in under 1 second. Complete production deployment guidelines are detailed in [docs/deployment.md](docs/deployment.md).

---

## 12. Known Limitations & Future Enhancements

### AWS S3 Storage
> **Product images currently use image URLs. AWS S3 object storage is planned as a production/cloud deployment enhancement and is not enabled in the current development environment.**

### Razorpay Production Payments
> **Payments are implemented using Razorpay Test Mode only. No live payment processing is enabled.**

### Future Enhancements
1. **Real-time Order Updates**: WebSocket / Server-Sent Events (SSE) for live order status notifications between vendors and customers.
2. **Automated Refund Processing**: Razorpay refund API integration for cancelled orders.
3. **Advanced Coupon Rules**: Category-specific and vendor-exclusive coupon targeting.
4. **Cloud Object Storage**: S3 direct presigned URL image uploads for vendor product galleries.
