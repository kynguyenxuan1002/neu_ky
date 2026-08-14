const pool = require('../config/db');

// Get Admin KPI stats
const getStats = async (req, res) => {
  try {
    const salesRes = await pool.query("SELECT COALESCE(SUM(total_amount), 0) as total_sales FROM orders WHERE status != 'Cancelled'");
    const ordersRes = await pool.query("SELECT COUNT(*) as total_orders FROM orders");
    const pendingRes = await pool.query("SELECT COUNT(*) as pending_orders FROM orders WHERE status = 'Pending'");
    const productsRes = await pool.query("SELECT COUNT(*) as total_products FROM products");

    res.json({
      totalSales: parseFloat(salesRes.rows[0].total_sales || 0),
      totalOrders: parseInt(ordersRes.rows[0].total_orders || 0, 10),
      pendingOrders: parseInt(pendingRes.rows[0].pending_orders || 0, 10),
      totalProducts: parseInt(productsRes.rows[0].total_products || 0, 10)
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải dữ liệu thống kê.' });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading orders:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải danh sách đơn hàng.' });
  }
};

// Get order detail (with items information)
const getOrderDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    const itemsResult = await pool.query(
      `SELECT oi.id, oi.quantity, oi.price, p.name as product_name, p.image_url 
       FROM order_items oi 
       INNER JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = $1`,
      [id]
    );

    res.json({
      order: orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Error loading order detail:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải chi tiết đơn hàng.' });
  }
};

// Update order status (PUT / PATCH)
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'Confirmed', 'Shipping', 'Completed', 'Cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ.' });
  }

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng cần cập nhật.' });
    }

    res.json({ message: 'Cập nhật trạng thái đơn hàng thành công.', order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật trạng thái.' });
  }
};

// Get all users for admin management
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, full_name, phone, address, COALESCE(is_active, true) as is_active FROM users ORDER BY id DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải danh sách người dùng.' });
  }
};

// Toggle user activation status
const toggleUserActive = async (req, res) => {
  const { id } = req.params;
  try {
    const userRes = await pool.query('SELECT id, is_active, role FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    // Protect admin role from deactivation
    if (userRes.rows[0].role === 'admin') {
      return res.status(403).json({ message: 'Không thể vô hiệu hóa tài khoản Quản trị viên!' });
    }

    const currentStatus = userRes.rows[0].is_active !== false;
    const newStatus = !currentStatus;

    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, id]);
    res.json({ message: 'Cập nhật trạng thái người dùng thành công.', is_active: newStatus });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi thay đổi trạng thái người dùng.' });
  }
};

module.exports = {
  getStats,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getUsers,
  toggleUserActive
};
