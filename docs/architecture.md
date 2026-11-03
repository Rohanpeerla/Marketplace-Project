# MarketHub System Architecture

## 1. High-Level Architecture

MarketHub is an enterprise multi-vendor e-commerce marketplace built as a high-performance monorepo with clean separation of concerns, modular service layers, and clear data ownership.

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

---

## 2. Core Components

### 2.1 Frontend Client (`frontend/`)
- **Technology**: React 19, Vite 8, Tailwind CSS v4.
- **State Management**: React Context API (`AuthContext` for JWT session & profile; `CartContext` for reactive shopping cart state & optimistic counts).
- **Navigation & Modals**: Fluid overlay system for Cart, Checkout, Order History, Product Details, Vendor Portal, Category Management, and Admin Analytics.
- **Theme**: Modern blue palette (`blue-600`, `blue-700`, `sky-500`, `slate-900`) with high-contrast accessibility and mobile-first responsiveness.

### 2.2 Backend Application (`backend/`)
- **Technology**: Node.js, Express.js.
- **Pattern**: Layered architecture:
  - `routes/`: Declares HTTP verbs, URL routes, and binds authentication/role middleware.
  - `middleware/`: Validates JWT Bearer tokens and enforces Role-Based Access Control (`requireRole('customer'|'vendor'|'admin')`).
  - `controllers/`: Handles HTTP request decoding, schema validation, and JSON response serialization.
  - `services/`: Encapsulates pure business logic, database transactions, cache invalidation, and search synchronization.
  - `models/`: Manages raw SQL execution with parameterized queries to prevent SQL injection.

### 2.3 PostgreSQL Database
- **Role**: Authoritative relational source of truth for all persistent entities across 12 normalized tables.
- **Key Guarantees**:
  - Pessimistic locking (`FOR UPDATE`) during multi-vendor checkout to guarantee zero overselling.
  - ACID transactions for multi-vendor order splitting, coupon redemption, and stock reduction.
  - Historical price immutability in `order_items` independent of future vendor product price changes.

### 2.4 Redis Cache Layer
- **Role**: Cache-aside store for active customer shopping carts under key `cart:{userId}` with a 1,800-second (30-minute) TTL.
- **Fault-Tolerance**: If Redis becomes unreachable, the backend logs a notice and transparently falls back to PostgreSQL without interrupting cart or checkout requests.

### 2.5 Elasticsearch Engine
- **Role**: Dedicated search engine providing sub-millisecond full-text queries, multi-field fuzzy matching, category/vendor/price filtering, and pagination.
- **Synchronization**: Product CRUD actions in PostgreSQL automatically orchestrate asynchronous Elasticsearch indexing/deletion.
- **Resilience**: If Elasticsearch is offline, catalog browsing gracefully falls back to PostgreSQL database queries.

### 2.6 Razorpay Payment Gateway (Test Mode)
- **Role**: Secure development payment processing using official Razorpay Test Mode keys or a zero-config test simulator.
- **Security**: Server-calculated amounts, cryptographically signed orders, and HMAC SHA-256 signature verification. No customer credit cards, CVVs, or live credentials are ever accepted or stored.

### 2.7 PDFKit Invoicing Engine
- **Role**: Dynamically streams RFC 2046 compliant `application/pdf` invoices with unique sequential invoice identifiers (`INV-YYYY-XXXXXX`), vendor breakdown, itemization, coupon discounts, and tax summaries.

---

## 3. Data Flow Workflows

### 3.1 Multi-Vendor Checkout Flow
```text
Customer Cart (Vendor A + Vendor B)
   ↓
Validate Customer Address & Optional Coupon Code
   ↓
BEGIN TRANSACTION
   ├─ Lock Selected Product Rows (SELECT ... FOR UPDATE)
   ├─ Verify Active Status & Inventory Sufficiency
   ├─ Group Items by Vendor ID
   ├─ Deduct Product Stock Atomically
   ├─ Create Parent Orders (1 per Vendor) with Historical Price Snapshots
   ├─ Increment Coupon used_count (if coupon applied)
   └─ Delete Customer Cart Items from PostgreSQL
COMMIT TRANSACTION
   ↓
Invalidate Redis Cart (`cart:{userId}`)
   ↓
Trigger Asynchronous Elasticsearch Stock Reindex
   ↓
Return Created Order IDs to Frontend
```

### 3.2 Razorpay Payment Verification Flow
```text
Frontend calls POST /api/payments/create-order
   ↓
Backend queries PostgreSQL for verified order IDs & computes amount
   ↓
Backend creates Razorpay Test Order (`order_...`) & stores payment records as 'created'
   ↓
Customer executes test payment (via Razorpay Popup or In-Modal Test Simulator)
   ↓
Frontend submits { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   ↓
Backend computes expected HMAC SHA-256: crypto.createHmac('sha256', secret).update(order_id + '|' + payment_id)
   ↓
Signatures Match?
   ├─ YES: Update payment records to 'paid', advance orders to 'confirmed'
   └─ NO:  Update payment records to 'failed', preserve orders in 'pending' for retry
```

