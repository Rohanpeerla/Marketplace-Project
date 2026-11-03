-- =============================================================================
-- MarketHub Multi-Vendor E-Commerce Marketplace
-- Database Seed Data (PostgreSQL)
-- =============================================================================
-- Seed Password for all test accounts: Password123!
-- Bcrypt Hash (cost factor 10): $2b$10$hzFlWYY/1Ppv4VqLiW7UIewPv9/RVcNcEdlbenEPYK4PWQOLnArDK
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED USERS (1 Admin, 2 Vendors, 3 Customers)
-- -----------------------------------------------------------------------------
INSERT INTO users (id, name, email, password_hash, role)
VALUES
    -- Admin User
    ('a0000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@markethub.com', '$2b$10$hzFlWYY/1Ppv4VqLiW7UIewPv9/RVcNcEdlbenEPYK4PWQOLnArDK', 'admin'),
    -- Vendor Users
    ('b0000000-0000-0000-0000-000000000001', 'Alex Turner', 'techcraft@markethub.com', '$2b$10$hzFlWYY/1Ppv4VqLiW7UIewPv9/RVcNcEdlbenEPYK4PWQOLnArDK', 'vendor'),
    ('b0000000-0000-0000-0000-000000000002', 'Sophia Chen', 'aurasound@markethub.com', '$2b$10$hzFlWYY/1Ppv4VqLiW7UIewPv9/RVcNcEdlbenEPYK4PWQOLnArDK', 'vendor'),
    -- Customer Users
    ('c0000000-0000-0000-0000-000000000001', 'John Doe', 'john.doe@example.com', '$2b$10$hzFlWYY/1Ppv4VqLiW7UIewPv9/RVcNcEdlbenEPYK4PWQOLnArDK', 'customer'),
    ('c0000000-0000-0000-0000-000000000002', 'Emma Watson', 'emma.watson@example.com', '$2b$10$hzFlWYY/1Ppv4VqLiW7UIewPv9/RVcNcEdlbenEPYK4PWQOLnArDK', 'customer'),
    ('c0000000-0000-0000-0000-000000000003', 'Michael Brown', 'michael.brown@example.com', '$2b$10$hzFlWYY/1Ppv4VqLiW7UIewPv9/RVcNcEdlbenEPYK4PWQOLnArDK', 'customer')
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
-- 4. SEED PRODUCTS (16 Comprehensive Marketplace Products)
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
    ),
    (
        'f0000000-0000-0000-0000-000000000007',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000004',
        'Organic Antibacterial Foaming Hand Wash (3-Pack)',
        'Gentle plant-based botanical foaming hand cleanser infused with organic aloe vera, tea tree extract, and vitamin E for daily sanitary care.',
        16.99,
        80,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000008',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000004',
        'Sonic Clean Ultrasonic Electric Toothbrush Pro',
        'High-efficiency sonic plaque defense with 40,000 vibrations per minute, 5 distinct cleaning modes, smart quad-pacer timer, and 30-day wireless charge.',
        42.50,
        55,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000009',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000004',
        'Nourishing Hydrating Body Wash & Shower Gel (500ml)',
        'Sulfate-free refreshing body wash enriched with raw shea butter, eucalyptus essential oils, and skin-replenishing ceramides.',
        14.50,
        75,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000010',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        'Classic Heavyweight Organic Cotton Crewneck Tee',
        'Premium 240 GSM combed organic cotton t-shirt with reinforced double-stitched collar, relaxed drape, and pre-shrunk softness.',
        24.00,
        90,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000011',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002',
        'All-Day Performance Stretch Commuter Chinos',
        'Wrinkle-resistant, breathable 4-way stretch everyday trousers tailored for seamless transitions between workspace, commute, and weekend.',
        54.00,
        45,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000012',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000002',
        'Lightweight Packable Hooded Windbreaker Jacket',
        'Weather-resistant ripstop shell featuring storm-sealed zip closures, breathable underarm venting, and self-stowing pocket design.',
        68.00,
        35,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000013',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000002',
        'Breathable Cushioned Everyday Walking Sneakers',
        'Ultralight engineered knit sneakers featuring high-rebound responsive memory foam insoles and flexible traction rubber outsoles.',
        79.99,
        50,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000014',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000003',
        'Double-Wall Vacuum Insulated Stainless Steel Bottle (1L)',
        'Pro-grade 18/8 stainless steel bottle keeping beverages ice-cold for 24 hours or piping hot for 12 hours with sweat-proof powder coating.',
        26.00,
        65,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000015',
        'e0000000-0000-0000-0000-000000000001',
        'd0000000-0000-0000-0000-000000000003',
        'Smart HEPA H13 Desktop Air Purifier',
        'Compact high-efficiency air purifier with True HEPA H13 filtration capturing 99.97% of airborne dust, pollen, odor, and smoke particles.',
        69.00,
        30,
        'active'
    ),
    (
        'f0000000-0000-0000-0000-000000000016',
        'e0000000-0000-0000-0000-000000000002',
        'd0000000-0000-0000-0000-000000000005',
        'Hardcover Dot-Grid Executive Productivity Journal',
        'Archival-quality 160 GSM bleed-resistant bamboo paper notebook with lay-flat thread binding, ribbon bookmark, and back document pocket.',
        18.50,
        70,
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
    ('80000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '/products/product-1.jpg', true),
    ('80000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', '/products/product-2.jpg', true),
    ('80000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', '/products/product-3.jpg', true),
    ('80000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000004', '/products/product-4.jpg', true),
    ('80000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000005', '/products/product-5.jpg', true),
    ('80000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000006', '/products/product-6.jpg', true),
    ('80000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000007', '/products/product-7.jpg', true),
    ('80000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000008', '/products/product-8.jpg', true),
    ('80000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000009', '/products/product-9.jpg', true),
    ('80000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000010', '/products/product-10.jpg', true),
    ('80000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000011', '/products/product-11.jpg', true),
    ('80000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000012', '/products/product-12.jpg', true),
    ('80000000-0000-0000-0000-000000000013', 'f0000000-0000-0000-0000-000000000013', '/products/product-13.jpg', true),
    ('80000000-0000-0000-0000-000000000014', 'f0000000-0000-0000-0000-000000000014', '/products/product-14.jpg', true),
    ('80000000-0000-0000-0000-000000000015', 'f0000000-0000-0000-0000-000000000015', '/products/product-15.jpg', true),
    ('80000000-0000-0000-0000-000000000016', 'f0000000-0000-0000-0000-000000000016', '/products/product-16.jpg', true)
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
