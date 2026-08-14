const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { rateLimiter, authenticateUser } = require('../middlewares/auth');

// Login Route
router.post('/login', rateLimiter(60 * 1000, 5, 'Thử đăng nhập quá nhiều lần. Vui lòng đợi 1 phút.'), authController.login);

// Register Route
router.post('/register', rateLimiter(60 * 1000, 10, 'Yêu cầu quá nhiều lần. Vui lòng đợi.'), authController.register);

// Profile Route
router.get('/profile', authenticateUser, authController.getProfile);

module.exports = router;
