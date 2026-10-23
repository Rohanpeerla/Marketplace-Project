-- =============================================================================
-- MarketHub Multi-Vendor E-Commerce Marketplace
-- Database Seed Data (PostgreSQL)
-- =============================================================================
-- Seed Password for all test accounts: Password123!
-- Bcrypt Hash (cost factor 10): $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED USERS (1 Admin, 2 Vendors, 3 Customers)
-- -----------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role)
VALUES
    -- Admin User
    ('a0000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@markethub.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin'),
    -- Vendor Users
    ('b0000000-0000-0000-0000-000000000001', 'Alex Turner', 'techcraft@markethub.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'vendor'),
    ('b0000000-0000-0000-0000-000000000002', 'Sophia Chen', 'aurasound@markethub.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'vendor'),
    -- Customer Users
    ('c0000000-0000-0000-0000-000000000001', 'John Doe', 'john.doe@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'customer'),
    ('c0000000-0000-0000-0000-000000000002', 'Emma Watson', 'emma.watson@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'customer'),
    ('c0000000-0000-0000-0000-000000000003', 'Michael Brown', 'michael.brown@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'customer')
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- -----------------------------------------------------------------------------
-- 2. SEED VENDORS (2 Verified Vendor Profiles)
-- -----------------------------------------------------------------------------
INSERT INTO vendors (id, user_id, business_name, business_email, phone, address, status)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'TechCraft Innovations',
        'contact@techcraft.io',
        '+1-555-010-2020',
        '100 Innovation Way, Suite 400, San Francisco, CA 94107',
        'approved'
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000002',
        'Aura Sound Labs',
        'support@aurasound.com',
        '+1-555-010-3030',
        '450 Acoustic Blvd, Floor 2, Austin, TX 78701',
        'approved'
    )
ON CONFLICT (user_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    business_email = EXCLUDED.business_email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    status = EXCLUDED.status;

-- -----------------------------------------------------------------------------
-- 3. SEED CATEGORIES (5 Core Categories)
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, name, description)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        'Electronics & Gadgets',
        'High-performance audio equipment, mechanical keyboards, and smart computer peripherals.'
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        'Fashion & Apparel',
        'Modern weather-resistant commuter gear, minimalist apparel, and lifestyle wear.'
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'Home & Living',
        'Artisanal ceramic tableware, ergonomic ambient lighting, and modern home essentials.'
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'Health & Wellness',
        'Ergonomic workplace wellness accessories, fitness devices, and personal care.'
    ),
    (
        'd0000000-0000-0000-0000-000000000005',
        'Books & Stationery',
        'Minimalist journals, architectural pens, and curated design publications.'
    )
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
-- 4. SEED PRODUCTS (6 Diverse Products)
-- -----------------------------------------------------------------------------
INSERT INTO products (id, vendor_id, category_id, name, description, price, stock, status)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000001',
        'Aura Wireless ANC Headphones Pro',
        'Flagship active noise cancelling over-ear headphones featuring 40mm titanium drivers and 40-hour battery life.',
        149.99,
        45,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'TechCraft Mechanical Keyboard (Hot-Swap RGB)',
        'Compact 75% mechanical keyboard with factory-lubed linear switches, sound dampening foam, and per-key RGB.',
        119.50,
        30,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000001',
        'TechCraft Precision Ergonomic Mouse',
        'Wireless ergonomic vertical mouse engineered to alleviate wrist strain with 4000 DPI optical sensor.',
        49.99,
        60,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000004',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000001',
        'Aura Soundbar Cinema 2.1',
        'Compact Dolby Audio TV soundbar with wireless down-firing subwoofer for cinematic audio immersion.',
        199.00,
        25,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000005',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000003',
        'Artisanal Ceramic Pour-Over Coffee Set',
        'Handcrafted ceramic dripper and heat-resistant borosilicate glass server with reusable stainless filter.',
        38.00,
        50,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000006',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        'All-Weather Commuter Laptop Backpack',
        'Weatherproof 24L modular backpack crafted from recycled Cordura nylon with dedicated 16-inch laptop pocket.',
        89.00,
        40,
        'active'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    stock = EXCLUDED.stock,
    status = EXCLUDED.status;

-- -----------------------------------------------------------------------------
-- 5. SEED PRODUCT IMAGES (Deterministic UUIDs)
-- -----------------------------------------------------------------------------
INSERT INTO product_images (id, product_id, image_url, is_primary)
VALUES
    ('80000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', true),
    ('80000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', true),
    ('80000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800', true),
    ('80000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800', true),
    ('80000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800', true),
    ('80000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', true)
ON CONFLICT (id) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    is_primary = EXCLUDED.is_primary;

-- -----------------------------------------------------------------------------
-- 6. SEED COUPONS (Deterministic UUIDs)
-- -----------------------------------------------------------------------------
INSERT INTO coupons (id, code, discount_type, discount_value, minimum_order_amount, maximum_discount_amount, active)
VALUES
    ('70000000-0000-0000-0000-000000000001', 'WELCOME10', 'percentage', 10.00, 50.00, 25.00, true),
    ('70000000-0000-0000-0000-000000000002', 'FREESHIP', 'fixed', 15.00, 75.00, 15.00, true)
ON CONFLICT (code) DO UPDATE SET
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    minimum_order_amount = EXCLUDED.minimum_order_amount,
    maximum_discount_amount = EXCLUDED.maximum_discount_amount,
    active = EXCLUDED.active;
