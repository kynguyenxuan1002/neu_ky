-- Drop tables if they exist (for clean initialization)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Will store hashed password or simple text
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    image_url TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Lighting', 'Security', 'Climate', 'Control')),
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL, -- Nullable for Guest Checkout
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('COD', 'Bank Transfer')),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Shipping', 'Completed', 'Cancelled')),
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(12, 2) NOT NULL
);

-- ========================================================
-- SEED DATA
-- ========================================================

-- Seed Admin User (password: admin123 - hashed using bcrypt)
-- Hashed value for 'admin123' is $2b$10$Wq3.z95Yp2c3pEx.QhB4eefgUoF9G0Y19z28u88NfD77eI7nU7D6S
INSERT INTO users (username, password, email, role) VALUES 
('admin', '$2a$10$0EqaIxy9Mt9N09Sz8V/b.OxbTM3mKWqSKwzyg8gptRY7SRPtrwoM6', 'admin@smarthome.com', 'admin');

-- Seed Products
-- Lighting Category
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Bóng Đèn Thông Minh Philips Hue White & Color Ambiance', 'Bóng đèn LED thông minh hỗ trợ 16 triệu màu, đồng bộ âm nhạc và điều khiển bằng giọng nói qua Apple HomeKit, Google Assistant hoặc Alexa.', 1250000.00, '/uploads/philips_hue_bulb.png', 'Lighting', 50),
('Dây Đèn LED Neon Thông Minh Yeelight', 'Dây đèn LED dẻo tạo hình RGBIC dài 2m, nháy theo nhạc, thích hợp trang trí góc PC, rạp chiếu phim tại gia.', 850000.00, '/uploads/yeelight_neon_led.png', 'Lighting', 30),
('Đèn Ngủ Cảm Biến Chuyển Động Aqara', 'Đèn đêm thông minh sử dụng pin, tự động sáng khi phát hiện người đi qua trong bóng tối, ánh sáng vàng dịu mắt.', 350000.00, '/uploads/aqara_nightlight.png', 'Lighting', 100);

-- Security Category
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Camera An Ninh Xiaomi 360 C300 2K', 'Camera giám sát gia đình độ phân giải 2K sắc nét, xoay 360 độ, đàm thoại 2 chiều và phát hiện người bằng AI.', 990000.00, '/uploads/xiaomi_c300_camera.png', 'Security', 40),
('Khóa Cửa Vân Tay Thông Minh Aqara A100', 'Khóa cửa cao cấp hỗ trợ vân tay, mã số, thẻ từ, Apple Home Key, chìa cơ dự phòng. Kết nối Zigbee 3.0 bảo mật cao.', 6490000.00, '/uploads/aqara_a100_lock.png', 'Security', 15),
('Cảm Biến Cửa Ra Vào Thông Minh Tuya Zigbee', 'Thiết bị nhỏ gọn gắn cửa giúp phát hiện trạng thái Đóng/Mở cửa và gửi cảnh báo tức thì về điện thoại khi có đột nhập.', 220000.00, '/uploads/tuya_door_sensor.png', 'Security', 120);

-- Climate Category
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Bộ Điều Khiển Điều Hòa Hồng Ngoại Tuya S06', 'Thay thế toàn bộ remote điều hòa, tivi trong nhà bằng điện thoại di động. Lập lịch hẹn giờ, bật điều hòa trước khi về nhà.', 390000.00, '/uploads/tuya_ir_control.png', 'Climate', 60),
('Công Tắc Bình Nóng Lạnh Thông Minh Sonoff 20A', 'Công tắc công suất cao chuyên dụng cho bình nóng lạnh, máy bơm nước. Điều khiển từ xa qua Wi-Fi, hẹn giờ tự động ngắt an toàn.', 420000.00, '/uploads/sonoff_20a_switch.png', 'Climate', 45),
('Cảm Biến Nhiệt Độ Độ Ẩm Màn Hình Aqara', 'Theo dõi nhiệt độ và độ ẩm thời gian thực trong phòng, liên kết tự động bật điều hòa hoặc máy lọc không khí.', 450000.00, '/uploads/aqara_temp_sensor.png', 'Climate', 75);

-- Control Category
INSERT INTO products (name, description, price, image_url, category, stock) VALUES
('Bộ Điều Khiển Trung Tâm Aqara Hub M2', 'Bộ não điều khiển toàn bộ thiết bị nhà thông minh Aqara thông qua sóng Zigbee 3.0, hỗ trợ cổng LAN ổn định và loa báo động.', 1890000.00, '/uploads/aqara_hub_m2.png', 'Control', 20),
('Màn Hình Thông Minh Google Nest Hub Gen 2', 'Trợ lý ảo Google tích hợp màn hình 7-inch hiển thị thông tin thời tiết, phát nhạc Youtube/Spotify và điều khiển nhanh các thiết bị thông minh.', 2150000.00, '/uploads/google_nest_hub.png', 'Control', 25),
('Ổ Cắm Thông Minh Tuya Wifi 16A Đo Điện Năng', 'Ổ cắm thông minh cắm trực tiếp, điều khiển bật tắt từ xa và đo lường lượng điện tiêu thụ của thiết bị điện trong nhà.', 180000.00, '/uploads/tuya_16a_plug.png', 'Control', 150);

