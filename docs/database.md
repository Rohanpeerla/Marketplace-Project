# MarketHub Database Architecture & Schema

MarketHub uses **PostgreSQL 16** as the ACID-compliant primary source of truth. All relations, foreign keys, constraints, and indexes are defined to ensure zero data anomalies and optimal query performance.

---

## 1. Entity-Relationship Overview

```text
       ┌──────────┐
       │  users   │◄───────────────┐
       └────┬─────┘                │
            │ 1:1                  │ 1:N
            ▼                      │
       ┌──────────┐                │
       │ vendors  │                │
       └────┬─────┘                │
            │ 1:N                  │
            ▼                      │
       ┌──────────┐          ┌─────┴──────┐
       │ products │◄─────────┤   reviews  │
       └────┬─────┘ 1:N      └────────────┘
            │
            ├────────────────────────┐
            │ 1:N                    │ 1:N
            ▼                        ▼
     ┌──────────────┐         ┌──────────────┐
     │product_images│         │  cart_items  │
     └──────────────┘         └──────┬───────┘
                                     │ N:1
                                     ▼
                              ┌──────────────┐
                              │    carts     │
                              └──────────────┘

       ┌──────────┐ 1:N      1:N ┌──────────────┐
       │  orders  ├─────────────►│ order_items  │
       └────┬─────┘              └──────────────┘
            │ 1:N
            ▼
       ┌──────────┐              ┌──────────────┐
       │ payments │              │   coupons    │
       └──────────┘              └──────────────┘
```

---

## 2. Table Specifications

### 2.1 `users`
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), Unique, Not Null)
- `password_hash` (VARCHAR(255), Not Null) - bcrypt hashed
- `full_name` (VARCHAR(255), Not Null)
- `role` (VARCHAR(20), Not Null, CHECK `role IN ('customer', 'vendor', 'admin')`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.2 `vendors`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Unique, Foreign Key `users.id` ON DELETE CASCADE)
- `business_name` (VARCHAR(255), Not Null)
- `phone` (VARCHAR(50))
- `business_address` (TEXT)
- `status` (VARCHAR(20), CHECK `status IN ('pending', 'approved', 'rejected')`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.3 `categories`
- `id` (UUID, Primary Key)
- `name` (VARCHAR(100), Unique, Not Null)
- `description` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.4 `products`
- `id` (UUID, Primary Key)
- `vendor_id` (UUID, Foreign Key `vendors.id` ON DELETE RESTRICT)
- `category_id` (UUID, Foreign Key `categories.id` ON DELETE RESTRICT)
- `name` (VARCHAR(255), Not Null)
- `description` (TEXT)
- `price` (DECIMAL(10,2), Not Null, CHECK `price >= 0`)
- `stock` (INTEGER, Not Null, CHECK `stock >= 0`)
- `status` (VARCHAR(20), CHECK `status IN ('active', 'inactive')`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.5 `product_images`
- `id` (UUID, Primary Key)
- `product_id` (UUID, Foreign Key `products.id` ON DELETE CASCADE)
- `image_url` (TEXT, Not Null)
- `is_primary` (BOOLEAN, Default false)
- `created_at` (TIMESTAMPTZ)

### 2.6 `carts` & `cart_items`
- `carts`: `id` (UUID, PK), `user_id` (UUID, Unique, FK `users.id` ON DELETE CASCADE), timestamps.
- `cart_items`: `id` (UUID, PK), `cart_id` (UUID, FK `carts.id` ON DELETE CASCADE), `product_id` (UUID, FK `products.id` ON DELETE CASCADE), `quantity` (INT, CHECK `quantity > 0`), UNIQUE(`cart_id`, `product_id`).

### 2.7 `orders` & `order_items`
- `orders`: `id` (UUID, PK), `invoice_number` (VARCHAR(50), Unique), `user_id` (UUID, FK `users.id`), `vendor_id` (UUID, FK `vendors.id`), `total_amount` (DECIMAL(10,2)), `discount_amount` (DECIMAL(10,2)), `coupon_code` (VARCHAR(50)), `order_status` (VARCHAR(20), CHECK `pending|placed|confirmed|shipped|delivered|cancelled`), `payment_status` (VARCHAR(20), CHECK `pending|paid|failed|refunded`), `shipping_address` (TEXT), timestamps.
- `order_items`: `id` (UUID, PK), `order_id` (UUID, FK `orders.id` ON DELETE CASCADE), `product_id` (UUID, FK `products.id`), `vendor_id` (UUID, FK `vendors.id`), `quantity` (INT), `price` (DECIMAL(10,2)) - *Preserved historical snapshot*, `subtotal` (DECIMAL(10,2)).

### 2.8 `payments`
- `id` (UUID, Primary Key)
- `order_id` (UUID, Foreign Key `orders.id` ON DELETE CASCADE)
- `amount` (DECIMAL(10,2), Not Null)
- `currency` (VARCHAR(10), Default 'INR')
- `payment_provider` (VARCHAR(50), Default 'razorpay')
- `razorpay_order_id` (VARCHAR(100), Indexed)
- `razorpay_payment_id` (VARCHAR(100))
- `razorpay_signature` (VARCHAR(255))
- `status` (VARCHAR(20), CHECK `created|pending|paid|failed|refunded`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.9 `reviews`
- `id` (UUID, Primary Key)
- `product_id` (UUID, Foreign Key `products.id` ON DELETE CASCADE)
- `user_id` (UUID, Foreign Key `users.id` ON DELETE CASCADE)
- `rating` (INT, Not Null, CHECK `rating BETWEEN 1 AND 5`)
- `comment` (TEXT, Not Null)
- UNIQUE(`product_id`, `user_id`) - *Prevents multiple reviews from the same purchaser for the same product*
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 2.10 `coupons`
- `id` (UUID, Primary Key)
- `code` (VARCHAR(50), Unique, Not Null)
- `discount_type` (VARCHAR(20), CHECK `discount_type IN ('percentage', 'fixed')`)
- `discount_value` (DECIMAL(10,2), Not Null)
- `max_discount` (DECIMAL(10,2))
- `min_order_amount` (DECIMAL(10,2), Default 0)
- `usage_limit` (INT)
- `used_count` (INT, Default 0)
- `is_active` (BOOLEAN, Default true)
- `valid_from`, `valid_until` (TIMESTAMPTZ)

---

## 3. Concurrency & Integrity Mechanisms

1. **Inventory Locking**:
   ```sql
   SELECT id, price, stock, status FROM products WHERE id = $1 FOR UPDATE OF products;
   ```
   Locks product rows in sorted order by UUID to eliminate deadlock and prevent overselling during concurrent checkout requests.

2. **Historical Price Preservation**:
   `order_items.price` snapshots the price paid at the exact instant of purchase, ensuring customer order totals and financial receipts never fluctuate when merchants modify product pricing.

3. **Atomic Coupon Counter**:
   ```sql
   UPDATE coupons SET used_count = used_count + 1 WHERE code = $1 AND (usage_limit IS NULL OR used_count < usage_limit);
   ```
   Ensures single-thread execution guarantees on limited promotional coupons without race conditions.

