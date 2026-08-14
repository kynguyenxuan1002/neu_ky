const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aurasmartsupersecretkey';

// Rate Limiter implementation
const rateLimitStore = {};
const rateLimiter = (windowMs, maxRequests, message) => {
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = [];
    }
    rateLimitStore[ip] = rateLimitStore[ip].filter(time => now - time < windowMs);
    if (rateLimitStore[ip].length >= maxRequests) {
      return res.status(429).json({ message: message || 'Yêu cầu quá thường xuyên. Vui lòng thử lại sau.' });
    }
    rateLimitStore[ip].push(now);
    next();
  };
};

// Simple XSS Input Sanitizer
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// ID validation middleware
const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum) || idNum <= 0) {
    return res.status(400).json({ message: 'Mã số ID không hợp lệ.' });
  }
  next();
};

// Authenticate Admin using JWT
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Từ chối truy cập. Vui lòng cung cấp token quản trị.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Từ chối truy cập. Bạn không có quyền quản trị.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

// Authenticate Customer User using JWT
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập để thực hiện chức năng này.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
};

module.exports = {
  JWT_SECRET,
  rateLimiter,
  sanitizeString,
  validateIdParam,
  authenticateAdmin,
  authenticateUser
};
