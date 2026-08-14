const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgrespassword',
  database: process.env.DB_DATABASE || 'smarthomedb',
};

const pool = new Pool(dbConfig);

const productImages = {
  'Bóng Đèn Thông Minh Philips Hue White & Color Ambiance': '/uploads/philips_hue_bulb.png',
  'Dây Đèn LED Neon Thông Minh Yeelight': '/uploads/yeelight_neon_led.png',
  'Đèn Ngủ Cảm Biến Chuyển Động Aqara': '/uploads/aqara_nightlight.png',
  'Camera An Ninh Xiaomi 360 C300 2K': '/uploads/xiaomi_c300_camera.png',
  'Khóa Cửa Vân Tay Thông Minh Aqara A100': '/uploads/aqara_a100_lock.png',
  'Cảm Biến Cửa Ra Vào Thông Minh Tuya Zigbee': '/uploads/tuya_door_sensor.png',
  'Bộ Điều Khiển Điều Hòa Hồng Ngoại Tuya S06': '/uploads/tuya_ir_control.png',
  'Công Tắc Bình Nóng Lạnh Thông Minh Sonoff 20A': '/uploads/sonoff_20a_switch.png',
  'Cảm Biến Nhiệt Độ Độ Ẩm Màn Hình Aqara': '/uploads/aqara_temp_sensor.png',
  'Bộ Điều Khiển Trung Tâm Aqara Hub M2': '/uploads/aqara_hub_m2.png',
  'Màn Hình Thông Minh Google Nest Hub Gen 2': '/uploads/google_nest_hub.png',
  'Ổ Cắm Thông Minh Tuya Wifi 16A Đo Điện Năng': '/uploads/tuya_16a_plug.png'
};

async function run() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected. Updating product images...');

    for (const [name, imageUrl] of Object.entries(productImages)) {
      const res = await client.query(
        'UPDATE products SET image_url = $1 WHERE name = $2 RETURNING id',
        [imageUrl, name]
      );
      if (res.rowCount > 0) {
        console.log(`✓ Updated "${name}" to: ${imageUrl}`);
      } else {
        console.log(`✗ Product not found: "${name}"`);
      }
    }

    client.release();
    console.log('All image URLs successfully updated in the database!');
  } catch (error) {
    console.error('Failed to update product images:', error);
  } finally {
    await pool.end();
  }
}

run();
