# MarketHub REST API Reference

All requests accept and return JSON unless otherwise stated (e.g. PDF invoice binary stream). Authenticated routes require an `Authorization: Bearer <jwt_token>` header.

---

## 1. Authentication & Session (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register customer or vendor account. |
| `POST` | `/api/auth/login` | Public | Authenticate user, return JWT token and role profile. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile and linked vendor details. |
| `GET` | `/api/auth/customer-test` | Customer | Verify customer role authorization guard. |
| `GET` | `/api/auth/vendor-test` | Vendor | Verify vendor role authorization guard. |
| `GET` | `/api/auth/admin-test` | Admin | Verify admin role authorization guard. |

---

## 2. Infrastructure Health (`/api/health`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Basic backend API uptime and timestamp check. |
| `GET` | `/api/health/db` | Public | PostgreSQL connection pool status check. |
| `GET` | `/api/health/redis` | Public | Redis cache connectivity status check. |
| `GET` | `/api/health/search` | Public | Elasticsearch cluster health check. |

---

## 3. Product Catalog & Search (`/api/products` & `/api/search`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Public | Direct database paginated product query with category/price filters. |
| `GET` | `/api/products/:id` | Public | Retrieve full product details including image gallery and vendor info. |
| `POST` | `/api/products` | Vendor / Admin | Create new product with primary image. Requires approved vendor status. |
| `PUT` | `/api/products/:id` | Vendor / Admin | Update product information (owner vendor or platform admin only). |
| `DELETE`| `/api/products/:id` | Vendor / Admin | Soft delete product (sets status to inactive, removes from search). |
| `POST` | `/api/products/:id/images` | Vendor / Admin | Attach secondary image URL to product. |
| `DELETE`| `/api/products/:id/images/:imageId` | Vendor / Admin | Remove image from product gallery. |
| `GET` | `/api/search/products` | Public | Full-text Elasticsearch search with fuzzy matching, sorting, and filters. |

---

## 4. Shopping Cart (`/api/cart`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Customer | Fetch current customer cart (Redis cache-aside with DB fallback). |
| `POST` | `/api/cart/items` | Customer | Add product to cart (`{ productId, quantity }`). |
| `PUT` | `/api/cart/items/:productId` | Customer | Update item quantity (`{ quantity }`). |
| `DELETE`| `/api/cart/items/:productId`| Customer | Remove item from cart. |
| `DELETE`| `/api/cart` | Customer | Clear entire cart. |

---

## 5. Orders & Invoices (`/api/orders`, `/api/vendor/orders`, `/api/admin/orders`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders/checkout` | Customer | Atomic multi-vendor checkout with optional coupon code. |
| `GET` | `/api/orders` | Customer | List customer's orders with pagination and status filtering. |
| `GET` | `/api/orders/:id` | Customer | Retrieve detailed customer order by ID (ownership verified). |
| `PUT` | `/api/orders/:id/cancel` | Customer | Cancel pending/placed order and restore inventory atomically. |
| `GET` | `/api/orders/:id/invoice` | Customer / Admin | Download generated PDF tax invoice (`INV-YYYY-XXXXXX`). |
| `GET` | `/api/vendor/orders` | Vendor | Retrieve vendor's isolated incoming orders. |
| `GET` | `/api/vendor/orders/:id` | Vendor | Retrieve vendor order details. |
| `PUT` | `/api/vendor/orders/:id/status` | Vendor | Update order status adhering to valid lifecycle state transitions. |
| `GET` | `/api/admin/orders` | Admin | Retrieve platform-wide order listing across all merchants. |
| `GET` | `/api/admin/orders/:id` | Admin | Retrieve complete platform order detail with customer & vendor metadata. |

---

## 6. Payments — Razorpay Test Mode (`/api/payments`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create-order` | Customer | Create Razorpay test order for one or more customer order IDs. |
| `POST` | `/api/payments/verify` | Customer | Verify payment cryptographic HMAC SHA-256 signature and confirm order. |
| `POST` | `/api/payments/fail` | Customer | Record payment failure or cancellation for retry tracking. |
| `GET` | `/api/payments/order/:orderId` | Customer / Vendor / Admin | Inspect payment record for an order. |
| `GET` | `/api/payments/config` | Public | Retrieve public Razorpay Key ID, currency, and test mode status. |

---

## 7. Product Reviews (`/api/reviews`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products/:productId/reviews` | Public | Retrieve product reviews, rating distribution, and average rating. |
| `POST` | `/api/reviews` | Customer | Submit review. Server strictly verifies verified-purchaser status. |
| `PUT` | `/api/reviews/:id` | Customer | Update existing review (owner customer only). |
| `DELETE`| `/api/reviews/:id` | Customer / Admin | Delete review (owner customer or admin moderation). |

---

## 8. Coupons (`/api/coupons`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/coupons/validate` | Customer | Validate coupon code against order subtotal before checkout. |
| `GET` | `/api/coupons` | Admin | List all promotional coupons with usage statistics. |
| `POST` | `/api/coupons` | Admin | Create percentage or fixed-discount promotional coupon. |
| `PUT` | `/api/coupons/:id` | Admin | Modify coupon dates, discount limits, or active status. |
| `DELETE`| `/api/coupons/:id` | Admin | Delete coupon. |

---

## 9. Admin Analytics (`/api/admin/analytics`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/analytics/overview` | Admin | High-level platform KPIs (revenue, orders, merchants, products). |
| `GET` | `/api/admin/analytics/revenue` | Admin | Monthly GMV history, daily trends, and payment collection breakdown. |
| `GET` | `/api/admin/analytics/orders` | Admin | Order lifecycle distribution, fulfillment rates, and cancellation rates. |
| `GET` | `/api/admin/analytics/products` | Admin | Top-selling products by volume and low-stock inventory alerts. |
| `GET` | `/api/admin/analytics/vendors` | Admin | Vendor performance leaderboard ranked by gross sales. |

