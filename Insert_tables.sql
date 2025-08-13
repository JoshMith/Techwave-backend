-- Insert users
INSERT INTO users (role, name, email, phone, password_hash) VALUES
('admin', 'Admin User', 'admin@techhub.co.ke', '+254700111222', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQD/.G8L33YktoM9v4O9rLqBS4FQJ5e'), -- password: admin123
('customer', 'John Kamau', 'john@example.com', '+254711222333', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQD/.G8L33YktoM9v4O9rLqBS4FQJ5e'),
('customer', 'Mary Wanjiku', 'mary@example.com', '+254722333444', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQD/.G8L33YktoM9v4O9rLqBS4FQJ5e'),
('seller', 'Tech Distributors Ltd', 'sales@techdist.co.ke', '+254733444555', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQD/.G8L33YktoM9v4O9rLqBS4FQJ5e'),
('seller', 'Gadget World', 'info@gadgetworld.co.ke', '+254744555666', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MQD/.G8L33YktoM9v4O9rLqBS4FQJ5e');

-- Insert sellers (linked to user accounts)
INSERT INTO sellers (user_id, business_name, tax_id, business_license) VALUES
(4, 'Tech Distributors Ltd', 'P051VV12345', 'BL-2023-TD-001'),
(5, 'Gadget World', 'P051GW67890', 'BL-2023-GW-002');

-- Insert addresses
INSERT INTO addresses (user_id, city, street, building, postal_code, is_default) VALUES
(2, 'Nairobi', 'Moi Avenue', 'Uchumi House', '00100', true),
(2, 'Meru', 'Kenyatta Highway', 'Meru Plaza', '60200', false),
(3, 'Nairobi', 'Kenyatta Avenue', 'Bruce House', '00100', true),
(4, 'Nairobi', 'Ngong Road', 'Sifa Towers', '00506', true),
(5, 'Meru', 'Karuana Market', 'Gadget Center', '60200', true);

-- Insert categories
INSERT INTO categories (name, description, featured, icon_path) VALUES
('Phones', 'Smartphones and feature phones', true, '/icons/phones.png'),
('Laptops', 'Laptops and notebooks', true, '/icons/laptops.png'),
('Accessories', 'Phone cases, chargers, etc.', true, '/icons/accessories.png'),
('Home Appliances', 'TVs, fridges, etc.', true, '/icons/appliances.png'),
('Gaming', 'PS5, Xbox, etc', true, '/icons/gaming.png'),
('Audio & Sound', 'Wireless Headphones, Bluetooth Speaker, etc', true, '/icons/audio-sound.png');

-- Insert products
INSERT INTO products (seller_id, category_id, title, description, price, sale_price, stock, specs, rating, review_count) VALUES
(1, 1, 'Samsung Galaxy A54', '128GB, 6.4" AMOLED, 5G', 44999, 42999, 25, 
 '{"ram": "6GB", "storage": "128GB", "battery": "5000mAh", "os": "Android 13"}', 4.5, 32),
(1, 1, 'Tecno Camon 20', '256GB, 64MP camera', 28999, NULL, 18,
 '{"ram": "8GB", "storage": "256GB", "battery": "5000mAh", "os": "Android 13"}', 4.2, 15),
(2, 2, 'HP Pavilion 15', 'Core i5, 8GB RAM, 512GB SSD', 89999, 84999, 8,
 '{"processor": "Intel Core i5-1235U", "ram": "8GB", "storage": "512GB SSD", "os": "Windows 11"}', 4.7, 21),
(2, 3, 'JBL Tune 510BT', 'Wireless over-ear headphones', 7999, 6999, 42,
 '{"color": "black", "battery": "40hrs", "bluetooth": "5.0"}', 4.3, 28),
(1, 4, 'Samsung 32" Smart TV', 'HD Ready, Android TV', 28999, 25999, 12,
 '{"screen": "32-inch", "resolution": "1366x768", "os": "Android TV"}', 4.1, 9);

-- Insert product images
INSERT INTO product_images (product_id, image_url, alt_text, is_primary) VALUES
(1, '/uploads/products/samsung-a54-1.jpg', 'Samsung Galaxy A54 front view', true),
(1, '/uploads/products/samsung-a54-2.jpg', 'Samsung Galaxy A54 back view', false),
(2, '/uploads/products/tecnocamon-1.jpg', 'Tecno Camon 20 main view', true),
(3, '/uploads/products/hp-pavilion-1.jpg', 'HP Pavilion 15 laptop open', true),
(4, '/uploads/products/jbl-headphones-1.jpg', 'JBL headphones black color', true),
(5, '/uploads/products/samsung-tv-1.jpg', 'Samsung 32-inch TV on stand', true);

-- Insert carts (both guest and user carts)
INSERT INTO carts (user_id, session_id, status) VALUES
(2, NULL, 'active'), -- John Kamau's cart
(3, NULL, 'active'), -- Mary Wanjiku's cart
(NULL, 'guest_session_abc123', 'active'), -- Guest cart
(NULL, 'guest_session_def456', 'abandoned'); -- Abandoned guest cart

-- Insert cart items
INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 42999), -- John has Samsung Galaxy in cart
(1, 4, 2, 6999),  -- John also has 2 JBL headphones
(2, 3, 1, 84999), -- Mary has HP laptop in cart
(3, 2, 1, 28999), -- Guest has Tecno phone in cart
(3, 5, 1, 25999); -- Guest also has Samsung TV

-- Insert delivery pricing
INSERT INTO delivery_pricing (city, min_free_delivery, standard_fee) VALUES
('Nairobi', 5000, 200),
('Meru', 7000, 350),
('Mombasa', 10000, 500),
('Kisumu', 8000, 400);

-- Insert special offers
INSERT INTO special_offers (title, description, discount_percent, banner_image_url, valid_until) VALUES
('Mid-Year Sale', 'Massive discounts on all electronics', 20, '/banners/midyear-sale.jpg', '2023-12-31'),
('Phone Mania', 'Discounts on all smartphones', 15, '/banners/phone-mania.jpg', '2023-11-30'),
('Back to School', 'Special laptop bundles', 10, '/banners/school-sale.jpg', '2024-01-31');

-- Link products to offers
INSERT INTO product_offers VALUES
(1, 2), -- Samsung Galaxy on Phone Mania
(2, 2), -- Tecno Camon on Phone Mania
(3, 3), -- HP Pavilion on Back to School
(4, 1), -- JBL headphones on Mid-Year Sale
(5, 1); -- Samsung TV on Mid-Year Sale

-- Insert orders (now linked to carts)
INSERT INTO orders (user_id, cart_id, address_id, total_amount, status) VALUES
(2, 1, 1, 56997, 'delivered'), -- John's order (from cart 1)
(3, 2, 3, 84999, 'shipped'),    -- Mary's order (from cart 2)
(2, NULL, 2, 42999, 'processing'); -- Older order without cart reference

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount) VALUES
(1, 1, 1, 42999, 2000),  -- Samsung Galaxy
(1, 4, 2, 6999, 1000),   -- JBL headphones (2x)
(2, 3, 1, 84999, 5000),  -- HP laptop
(3, 1, 1, 42999, 2000);  -- Samsung Galaxy in separate order

-- Insert payments
INSERT INTO payments (order_id, method, amount, mpesa_code, mpesa_phone, is_confirmed, confirmed_at) VALUES
(1, 'mpesa', 56997, 'NLJ9H2AK', '+254711222333', true, '2023-10-15 14:30:00+03'),
(2, 'mpesa', 84999, 'MK45H2B3', '+254722333444', true, '2023-10-16 09:15:00+03'),
(3, 'mpesa', 42999, 'P98K3L4M', '+254711222333', false, NULL);

-- Insert reviews
INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
(2, 1, 5, 'Excellent phone with great battery life!'),
(3, 4, 4, 'Good sound quality but could be more comfortable'),
(2, 3, 5, 'Perfect laptop for my university work');