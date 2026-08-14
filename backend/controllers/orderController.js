const pool = require('../config/db');
const { sanitizeString } = require('../middlewares/auth');

// Create new customer order (Supports transaction and voucher verification)
const createOrder = async (req, res) => {
  const customerName = sanitizeString(req.body.customerName);
  const customerPhone = sanitizeString(req.body.customerPhone);
  const customerAddress = sanitizeString(req.body.customerAddress);
  const paymentMethod = sanitizeString(req.body.paymentMethod);
  const promoCode = req.body.promoCode ? sanitizeString(req.body.promoCode).toUpperCase() : '';
  const paymentReceiptUrl = req.body.paymentReceiptUrl ? String(req.body.paymentReceiptUrl).trim() : null;
  const { items } = req.body;
  const userId = req.user.id;

  if (!customerName || !customerPhone || !customerAddress || !paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin giao hàng và giỏ hàng.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start transaction

    let totalAmount = 0;
    const orderItemsToInsert = [];

    // Verify stock and calculate total price
    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error('Số lượng sản phẩm đặt hàng không hợp lệ.');
      }

      const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.id]);
      if (productResult.rows.length === 0) {
        throw new Error(`Sản phẩm với ID ${item.id} không tồn tại.`);
      }

      const product = productResult.rows[0];
      if (product.stock < quantity) {
        throw new Error(`Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm trong kho.`);
      }

      const itemTotal = parseFloat(product.price) * quantity;
      totalAmount += itemTotal;

      orderItemsToInsert.push({
        productId: product.id,
        quantity: quantity,
        price: product.price
      });

      // Deduct product stock
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product.id]);
    }

    // Apply Promo Code Server-Side
    let discountAmount = 0;
    if (promoCode === 'SIEUHOI10') {
      discountAmount = totalAmount * 0.10;
    } else if (promoCode === 'AURANEW') {
      discountAmount = 150000;
    }
    totalAmount = Math.max(0, totalAmount - discountAmount);

    // Insert Order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, payment_method, status, total_amount, payment_receipt_url) 
       VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7) RETURNING id`,
      [userId, customerName, customerPhone, customerAddress, paymentMethod, totalAmount, paymentReceiptUrl]
    );
    const orderId = orderResult.rows[0].id;

    // Insert Order Items
    for (const orderItem of orderItemsToInsert) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, orderItem.productId, orderItem.quantity, orderItem.price]
      );
    }

    await client.query('COMMIT'); // Commit transaction
    res.status(201).json({
      message: 'Đặt hàng thành công!',
      orderId: orderId,
      totalAmount: totalAmount
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Order creation transaction failed:', error.message);
    res.status(400).json({ message: error.message || 'Đặt hàng thất bại. Vui lòng thử lại.' });
  } finally {
    client.release();
  }
};

// Get My Orders
const getMyOrders = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY id DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải đơn hàng của bạn.' });
  }
};

module.exports = {
  createOrder,
  getMyOrders
};
