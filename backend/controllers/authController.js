const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET, sanitizeString } = require('../middlewares/auth');

// Customer and Admin Login
const login = async (req, res) => {
  const username = sanitizeString(req.body.username);
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Tài khoản không tồn tại hoặc sai thông tin.' });
    }

    const user = result.rows[0];

    // Check deactivated
    if (user.is_active === false) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị vô hiệu hóa do vi phạm quy chế.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không chính xác.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng nhập.' });
  }
};

// Customer Registration
const register = async (req, res) => {
  const username = sanitizeString(req.body.username);
  const password = req.body.password;
  const fullName = sanitizeString(req.body.fullName);
  const phone = sanitizeString(req.body.phone);
  const address = sanitizeString(req.body.address);
  const email = req.body.email && req.body.email.trim() !== '' 
    ? sanitizeString(req.body.email) 
    : `${username}@aurasmart.vn`;

  if (!username || !password || !fullName || !phone || !address) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ Tên đăng nhập, Mật khẩu, Họ tên, SĐT và Địa chỉ.' });
  }

  try {
    const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, password, email, role, full_name, phone, address, is_active) 
       VALUES ($1, $2, $3, 'user', $4, $5, $6, true) RETURNING id, username, email, full_name, phone, address`,
      [username, hashedPassword, email, fullName, phone, address]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công!',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: 'user',
        fullName: newUser.full_name,
        phone: newUser.phone,
        address: newUser.address
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi đăng ký tài khoản.' });
  }
};

// Get User Profile
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, full_name, phone, address, COALESCE(is_active, true) as is_active FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin tài khoản.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi lấy thông tin tài khoản.' });
  }
};

module.exports = {
  login,
  register,
  getProfile
};
