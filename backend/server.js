require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration (Allows React frontend at port 5173)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Body parser configuration with large limit for base64 image uploads
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes); // Mounts /products, /upload, /chat
app.use('/api', orderRoutes);   // Mounts /orders, /user/orders
app.use('/api/admin', adminRoutes); // Mounts /admin/stats, /admin/orders, /admin/products, /admin/users

// Root status check route
app.get('/api/status', (req, res) => {
  res.json({ status: 'AURA SMART BACKEND OK', time: new Date() });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 Aura Smart server is running on port ${PORT}`);
  console.log(`📂 Static uploads served at http://localhost:${PORT}/uploads/`);
});
