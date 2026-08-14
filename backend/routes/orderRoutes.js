const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { rateLimiter, authenticateUser } = require('../middlewares/auth');

// Create Order Route (Rate-limited, Protected)
router.post('/orders', authenticateUser, rateLimiter(5 * 60 * 1000, 10, 'Bạn đặt hàng quá nhanh. Vui lòng đợi 5 phút.'), orderController.createOrder);

// Get My Orders Route (Protected)
router.get('/user/orders', authenticateUser, orderController.getMyOrders);

module.exports = router;
