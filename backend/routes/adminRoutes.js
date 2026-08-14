const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const { validateIdParam, authenticateAdmin } = require('../middlewares/auth');

// Apply admin authentication to all admin routes
router.use(authenticateAdmin);

// KPI Stats
router.get('/stats', adminController.getStats);

// Orders List & Details
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', validateIdParam, adminController.getOrderDetail);
router.put('/orders/:id/status', validateIdParam, adminController.updateOrderStatus);
router.patch('/orders/:id/status', validateIdParam, adminController.updateOrderStatus);

// Products CRUD
router.post('/products', productController.createProduct);
router.put('/products/:id', validateIdParam, productController.updateProduct);
router.delete('/products/:id', validateIdParam, productController.deleteProduct);

// Users Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/toggle-active', validateIdParam, adminController.toggleUserActive);

module.exports = router;
