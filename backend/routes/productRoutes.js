const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { validateIdParam } = require('../middlewares/auth');

// Get all products
router.get('/products', productController.getProducts);

// Get single product detail
router.get('/products/:id', validateIdParam, productController.getProductDetail);

// Upload image static route
router.post('/upload', productController.uploadImage);

// AI Chatbot Route
router.post('/chat', productController.handleAIChatbot);

module.exports = router;
