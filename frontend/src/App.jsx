import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

// Currency Formatter (VND)
const formatVND = (num) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
};

// Helper to get correct product image URL (Points to backend port 5000)
const getImageUrl = (url) => {
  if (!url) return 'http://localhost:5000/uploads/philips_hue_bulb.png';
  if (url.startsWith('/uploads/')) {
    return `http://localhost:5000${url}`;
  }
  return url;
};

// Helper to parse markdown **bold** and newlines in chatbot messages
const renderChatMessageText = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // Split line by markdown ** bold tags
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const lineContent = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={partIdx} style={{ color: 'var(--text-heading)', fontWeight: '800' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    return (
      <span key={lineIdx} style={{ display: 'block', marginBottom: '0.4rem' }}>
        {lineContent}
      </span>
    );
  });
};

export default function App() {
  // Navigation State: 'shop', 'cart', 'user-auth', 'my-orders', 'login', 'admin', 'success'
  const [page, setPage] = useState('shop');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Main Data States
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    const localCart = localStorage.getItem('smarthome_cart');
    return localCart ? JSON.parse(localCart) : [];
  });

  // Feedback Toast State
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Promo Code States
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percent');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // User Auth & Account States
  const [userToken, setUserToken] = useState(() => localStorage.getItem('user_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userLoginForm, setUserLoginForm] = useState({ username: '', password: '' });
  const [userRegisterForm, setUserRegisterForm] = useState({
    username: '', password: '', email: '', fullName: '', phone: '', address: ''
  });
  const [userMyOrders, setUserMyOrders] = useState([]);

  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    paymentMethod: 'COD',
    paymentReceiptUrl: ''
  });
  const [successOrder, setSuccessOrder] = useState(null);

  // Admin State
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [adminTab, setAdminTab] = useState('dashboard');
  const [adminStats, setAdminStats] = useState({ totalSales: 0, totalOrders: 0, pendingOrders: 0, totalProducts: 0 });
  const [adminOrders, setAdminOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Pending');
  const [productForm, setProductForm] = useState({ id: null, name: '', description: '', price: '', category: 'Lighting', stock: '', imageUrl: '' });
  const [showProductModal, setShowProductModal] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  // AI Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Xin chào! Tôi là Aura AI, trợ lý tư vấn thiết bị thông minh của cửa hàng. Bạn cần tìm hiểu sản phẩm gì hôm nay?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Save Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem('smarthome_cart', JSON.stringify(cart));
  }, [cart]);

  // Autofill Checkout form if user is logged in
  useEffect(() => {
    if (currentUser) {
      setCheckoutForm(prev => ({
        ...prev,
        customerName: currentUser.fullName || currentUser.username || prev.customerName,
        customerPhone: currentUser.phone || prev.customerPhone,
        customerAddress: currentUser.address || prev.customerAddress
      }));
    }
  }, [currentUser]);

  // Fetch Products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch My Orders for Logged-in Customer
  const fetchUserOrders = async () => {
    if (!userToken) return;
    try {
      const res = await fetch(`${API_BASE}/user/orders`, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserMyOrders(data);
      }
    } catch (err) {
      console.error("Error fetching user orders:", err);
    }
  };

  useEffect(() => {
    if (page === 'my-orders' && userToken) {
      fetchUserOrders();
      const interval = setInterval(fetchUserOrders, 6000);
      return () => clearInterval(interval);
    }
  }, [page, userToken]);

  // Fetch Admin Stats & Orders
  const fetchAdminData = async () => {
    if (!adminToken) return;
    try {
      const statsRes = await fetch(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdminStats(statsData);
      }

      const ordersRes = await fetch(`${API_BASE}/admin/orders`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setAdminOrders(ordersData);
      }

      const usersRes = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAdminUsers(usersData);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  useEffect(() => {
    if (page === 'admin' && adminToken) {
      fetchAdminData();
    }
  }, [page, adminToken]);

  // Toast alert trigger
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  // Cart operations
  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    
    if (currentQty + 1 > product.stock) {
      showAlert(`Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho!`, 'error');
      return;
    }

    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showAlert(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  const updateQuantity = (productId, delta) => {
    const product = products.find(p => p.id === productId);
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty > (product ? product.stock : item.stock)) {
          showAlert(`Số lượng vượt quá tồn kho khả dụng`, 'error');
          return item;
        }
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  let discountAmount = 0;
  if (promoApplied) {
    if (discountType === 'percent') {
      discountAmount = (rawSubtotal * discount) / 100;
    } else {
      discountAmount = discount;
    }
  }
  const cartTotal = Math.max(0, rawSubtotal - discountAmount);

  // Apply Voucher
  const handleApplyPromo = (e) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'SIEUHOI10') {
      setDiscount(10);
      setDiscountType('percent');
      setPromoApplied(true);
      showAlert('Đã áp dụng mã SIEUHOI10 (Giảm 10%)');
    } else if (code === 'AURANEW') {
      setDiscount(150000);
      setDiscountType('fixed');
      setPromoApplied(true);
      showAlert('Đã áp dụng mã AURANEW (Giảm 150.000đ)');
    } else {
      setPromoError('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }
  };

  // Receipt Upload for Bank Transfer
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: reader.result, filename: file.name })
        });
        const data = await res.json();
        if (res.ok) {
          setCheckoutForm(prev => ({ ...prev, paymentReceiptUrl: data.imageUrl || data.url }));
          showAlert('Đã tải lên biên lai thanh toán thành công');
        }
      } catch (err) {
        showAlert('Tải lên biên lai thất bại', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Product Image Upload (Admin)
  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: reader.result, filename: file.name })
        });
        const data = await res.json();
        if (res.ok) {
          setProductForm(prev => ({ ...prev, imageUrl: data.imageUrl || data.url }));
          showAlert('Đã tải ảnh sản phẩm thành công');
        }
      } catch (err) {
        showAlert('Lỗi tải ảnh sản phẩm', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Checkout Handler (Requires Logged-in Customer)
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!userToken) {
      showAlert('Quý khách vui lòng đăng nhập tài khoản để thực hiện đặt hàng', 'error');
      setPage('user-auth');
      return;
    }

    if (!checkoutForm.customerName || !checkoutForm.customerPhone || !checkoutForm.customerAddress) {
      showAlert('Vui lòng điền đầy đủ thông tin giao hàng', 'error');
      return;
    }

    if (checkoutForm.paymentMethod === 'Bank Transfer' && !checkoutForm.paymentReceiptUrl) {
      showAlert('Vui lòng tải lên ảnh biên lai chuyển khoản ngân hàng', 'error');
      return;
    }

    try {
      const payload = {
        customerName: checkoutForm.customerName,
        customerPhone: checkoutForm.customerPhone,
        customerAddress: checkoutForm.customerAddress,
        paymentMethod: checkoutForm.paymentMethod,
        paymentReceiptUrl: checkoutForm.paymentReceiptUrl,
        items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
        promoCode: promoApplied ? promoCode : null
      };

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessOrder({
          id: data.orderId,
          customer_name: checkoutForm.customerName,
          total_amount: data.totalAmount
        });
        setCart([]);
        setPromoApplied(false);
        setPromoCode('');
        setPage('success');
        fetchProducts();
        fetchUserOrders();
      } else {
        showAlert(data.message || data.error || 'Đặt hàng thất bại', 'error');
      }
    } catch (err) {
      showAlert('Đã xảy ra lỗi khi tạo đơn hàng', 'error');
    }
  };

  // User Authentication Handlers
  const handleUserLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userLoginForm)
      });
      const data = await res.json();
      if (res.ok) {
        setUserToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('user_token', data.token);
        localStorage.setItem('current_user', JSON.stringify(data.user));
        
        // Clear conflicting admin session
        setAdminToken('');
        localStorage.removeItem('admin_token');

        setPage('shop');
        showAlert(`Xin chào khách hàng ${data.user.fullName || data.user.username}!`);
      } else {
        const errorMsg = data.message || 'Tài khoản hoặc mật khẩu không đúng.';
        setAuthError(errorMsg);
      }
    } catch (err) {
      setAuthError('Lỗi kết nối máy chủ backend.');
    }
  };

  const handleUserRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userRegisterForm)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
        setIsRegistering(false);
        setUserLoginForm({ username: userRegisterForm.username, password: userRegisterForm.password });
        setAuthError('');
      } else {
        const errorMsg = data.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại.';
        setAuthError(errorMsg);
      }
    } catch (err) {
      setAuthError('Lỗi hệ thống khi đăng ký.');
    }
  };

  const handleUserLogout = () => {
    setUserToken('');
    setCurrentUser(null);
    localStorage.removeItem('user_token');
    localStorage.removeItem('current_user');
    setPage('shop');
    showAlert('Đã đăng xuất tài khoản khách hàng');
  };

  // Chatbot Handler
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: chatMessages })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { sender: 'bot', text: 'Xin lỗi, tôi gặp sự cố khi kết nối server AI. Vui lòng thử lại sau.' }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: '🌱 Aura AI: Cửa hàng đang có nhiều thiết bị nhà thông minh chất lượng. Bạn cần tư vấn nhóm sản phẩm nào?' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Admin Auth Login Handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user.role !== 'admin') {
          showAlert('Tài khoản này không có quyền Quản trị viên', 'error');
          return;
        }
        setAdminToken(data.token);
        localStorage.setItem('admin_token', data.token);
        
        // Clear conflicting user session
        setUserToken('');
        setCurrentUser(null);
        localStorage.removeItem('user_token');
        localStorage.removeItem('current_user');

        setPage('admin');
        showAlert('Đăng nhập Quản trị viên thành công');
      } else {
        showAlert(data.message || 'Tài khoản hoặc mật khẩu Admin không đúng', 'error');
      }
    } catch (err) {
      showAlert('Lỗi kết nối máy chủ', 'error');
    }
  };

  // Admin Logout
  const handleAdminLogout = () => {
    setAdminToken('');
    localStorage.removeItem('admin_token');
    setPage('shop');
    showAlert('Đã đăng xuất tài khoản quản trị');
  };

  // Admin Order Status Update with Confirm Button
  const handleSaveOrderStatus = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${selectedOrder.order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: selectedStatus })
      });
      if (res.ok) {
        showAlert(`Đã cập nhật trạng thái đơn #${selectedOrder.order.id} thành "${selectedStatus}"`);
        setSelectedOrder(null);
        fetchAdminData();
      } else {
        showAlert('Cập nhật trạng thái thất bại', 'error');
      }
    } catch (err) {
      showAlert('Cập nhật trạng thái thất bại', 'error');
    }
  };
  // Toggle user activation status (Deactivate / Reactivate User)
  const handleToggleUserActive = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-active`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Cập nhật trạng thái người dùng thành công');
        fetchAdminData();
      } else {
        showAlert(data.message || 'Lỗi cập nhật trạng thái người dùng', 'error');
      }
    } catch (err) {
      showAlert('Lỗi kết nối máy chủ', 'error');
    }
  };

  // Admin Product Save / Edit
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const isEdit = !!productForm.id;
    const url = isEdit ? `${API_BASE}/admin/products/${productForm.id}` : `${API_BASE}/admin/products`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          price: parseFloat(productForm.price),
          category: productForm.category,
          stock: parseInt(productForm.stock),
          imageUrl: productForm.imageUrl || '/uploads/philips_hue_bulb.png'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(isEdit ? 'Đã cập nhật chi tiết sản phẩm thành công!' : 'Đã thêm sản phẩm mới thành công!');
        setShowProductModal(false);
        setProductForm({ id: null, name: '', description: '', price: '', category: 'Lighting', stock: '', imageUrl: '' });
        fetchProducts();
        fetchAdminData();
      } else {
        showAlert(data.message || 'Lỗi lưu thông tin sản phẩm', 'error');
      }
    } catch (err) {
      showAlert('Lỗi khi lưu thông tin sản phẩm', 'error');
    }
  };

  // Admin Product Delete
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.ok) {
        showAlert('Đã xóa sản phẩm khỏi hệ thống');
        fetchProducts();
        fetchAdminData();
      }
    } catch (err) {
      showAlert('Xóa sản phẩm thất bại', 'error');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const isAdminLoggedIn = !!adminToken;
  const isCustomerLoggedIn = !!userToken;

  return (
    <div className="app-container">
      {/* Toast Alert Banner (Central Floating Banner) */}
      {alert.show && (
        <div className={`alert-toast ${alert.type}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {alert.type === 'success' ? (
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/>
            ) : (
              <>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </>
            )}
          </svg>
          {alert.message}
        </div>
      )}

      {/* Header / Sticky Navigation */}
      <header className="navbar">
        <div className="nav-logo" onClick={() => { setPage('shop'); setActiveCategory('All'); }}>
          <div className="logo-badge">
            <svg viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
          </div>
          <div className="logo-text">AURA<span>SMART</span></div>
        </div>

        <nav className="nav-links">
          <a className={`nav-link ${page === 'shop' ? 'active' : ''}`} onClick={() => setPage('shop')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Cửa Hàng
          </a>

          <a className={`nav-link cart-badge-container ${page === 'cart' ? 'active' : ''}`} onClick={() => setPage('cart')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Giỏ Hàng
            {cartItemsCount > 0 && <span className="cart-badge">{cartItemsCount}</span>}
          </a>

          {/* Customer and Guest Links (Only visible when NOT inside Admin Dashboard page view) */}
          {page !== 'admin' && (
            isCustomerLoggedIn ? (
              <>
                <a className={`nav-link ${page === 'my-orders' ? 'active' : ''}`} onClick={() => setPage('my-orders')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Đơn Hàng Của Tôi
                </a>
                <a className="nav-link" onClick={handleUserLogout} style={{ color: 'var(--accent-rose)', fontWeight: '800' }}>
                  🚪 Đăng Xuất ({currentUser?.fullName || currentUser?.username})
                </a>
              </>
            ) : (
              <>
                <a className={`nav-link ${page === 'user-auth' ? 'active' : ''}`} onClick={() => setPage('user-auth')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Đăng Nhập Khách
                </a>
                {isAdminLoggedIn ? (
                  <a className={`nav-link ${page === 'admin' ? 'active' : ''}`} onClick={() => setPage('admin')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Quản Trị Hệ Thống
                  </a>
                ) : (
                  <a className={`nav-link ${page === 'login' ? 'active' : ''}`} onClick={() => setPage('login')}>
                    Admin Portal
                  </a>
                )}
              </>
            )
          )}

          {/* Admin Back Link (Only visible when active in Admin Dashboard page view) */}
          {page === 'admin' && (
            <a className="nav-link" onClick={handleAdminLogout} style={{ color: 'var(--accent-rose)', fontWeight: '800' }}>
              🚪 Thoát Admin
            </a>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* SHOP PAGE */}
        {page === 'shop' && (
          <div className="shop-layout">
            <section className="hero-banner">
              <div className="hero-tag">
                🌿 Hệ Sinh Thái Nhà Thông Minh Sống Xanh & An Toàn
              </div>
              <h1>Kiến Tạo Không Gian Sống Thông Minh</h1>
              <p>Khám phá hệ sinh thái điều khiển, an ninh & chiếu sáng cao cấp kết hợp Trợ lý Trí tuệ Nhân tạo Aura AI.</p>

              <div className="hero-stats">
                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-num">100+</span>
                    <span className="stat-label">Thiết Bị Kết Nối</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-num">0.1s</span>
                    <span className="stat-label">Phản Hồi Aura AI</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-num">24/7</span>
                    <span className="stat-label">Bảo Mật An Ninh</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="controls-bar">
              <div className="category-tabs">
                {['All', 'Lighting', 'Security', 'Climate', 'Control'].map(cat => (
                  <button
                    key={cat}
                    className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat === 'All' && '✨ Tất Cả'}
                    {cat === 'Lighting' && '💡 Chiếu Sáng'}
                    {cat === 'Security' && '🔒 An Ninh'}
                    {cat === 'Climate' && '❄️ Điều Hòa'}
                    {cat === 'Control' && '🎛️ Điều Khiển'}
                  </button>
                ))}
              </div>

              <div className="search-box">
                <svg className="search-icon-svg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tìm kiếm thiết bị thông minh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="products-grid">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="product-card skeleton" style={{ height: '400px' }}></div>
                ))
              ) : (
                filteredProducts.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-image-container">
                      <img src={getImageUrl(product.image_url)} alt={product.name} className="product-image" />
                      <span className="product-category-tag">{product.category}</span>
                    </div>

                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-desc">{product.description}</p>
                      
                      <div className="product-meta">
                        <span className="product-price">{formatVND(product.price)}</span>
                        <div className="stock-indicator">
                          <span className={`stock-dot ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}></span>
                          {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem' }}
                        disabled={product.stock <= 0}
                        onClick={() => addToCart(product)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        {product.stock > 0 ? 'Thêm Vào Giỏ' : 'Tạm Hết Hàng'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CART & CHECKOUT PAGE */}
        {page === 'cart' && (
          <div className="cart-layout">
            <div className="cart-items-container">
              <h2 className="cart-title">Giỏ Hàng Của Bạn</h2>

              {cart.length === 0 ? (
                <div className="cart-empty">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  <h3>Giỏ hàng đang trống</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Chưa có thiết bị thông minh nào được chọn.</p>
                  <button className="btn btn-primary" onClick={() => setPage('shop')}>
                    Quay lại Cửa hàng
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <img src={getImageUrl(item.image_url)} alt={item.name} className="cart-item-img" />
                    <div className="cart-item-info">
                      <span className="cart-item-category">{item.category}</span>
                      <h4 className="cart-item-name">{item.name}</h4>
                      <span className="cart-item-price">{formatVND(item.price)}</span>
                    </div>

                    <div className="quantity-controller">
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span className="qty-val">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>

                    <button className="btn btn-danger" style={{ padding: '0.4rem 0.6rem' }} onClick={() => removeFromCart(item.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="cart-summary-container">
                <h3 style={{ fontFamily: 'var(--font-main)', marginBottom: '1.25rem', fontSize: '1.2rem' }}>Thanh Toán & Đặt Hàng</h3>

                {!userToken ? (
                  /* MANDATORY LOGIN TO CHECKOUT BANNER */
                  <div className="checkout-auth-required-panel">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔒</div>
                    <h4 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', marginBottom: '0.5rem', fontWeight: '800' }}>
                      Yêu Cầu Đăng Nhập Để Đặt Hàng
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                      Theo quy định của Aura Smart, quý khách vui lòng Đăng nhập hoặc Tạo tài khoản Khách Hàng mới để thực hiện thanh toán và theo dõi hành trình đơn hàng.
                    </p>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.85rem' }}
                      onClick={() => setPage('user-auth')}
                    >
                      🔑 Đăng Nhập / Đăng Ký Tài Khoản Ngay
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Voucher Section */}
                    <form onSubmit={handleApplyPromo} style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Mã giảm giá (ví dụ: SIEUHOI10)"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                      />
                      <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>Mã Giảm</button>
                    </form>
                    {promoError && <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginBottom: '1rem' }}>{promoError}</p>}
                    {promoApplied && <p style={{ color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '700' }}>✓ Đã áp dụng chiết khấu voucher</p>}

                    <div className="summary-row">
                      <span>Tạm tính:</span>
                      <span>{formatVND(rawSubtotal)}</span>
                    </div>
                    {promoApplied && (
                      <div className="summary-row" style={{ color: 'var(--primary)' }}>
                        <span>Giảm giá:</span>
                        <span>-{formatVND(discountAmount)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Tổng tiền:</span>
                      <span>{formatVND(cartTotal)}</span>
                    </div>

                    {/* Checkout Form */}
                    <form onSubmit={handleCheckout} style={{ marginTop: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">Họ và tên người nhận *</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={checkoutForm.customerName}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, customerName: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Số điện thoại *</label>
                        <input
                          type="tel"
                          className="form-input"
                          required
                          placeholder="Ví dụ: 0912345678"
                          value={checkoutForm.customerPhone}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, customerPhone: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Địa chỉ giao hàng *</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="Ví dụ: Số 123 Đường Cầu Giấy, Hà Nội"
                          value={checkoutForm.customerAddress}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, customerAddress: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phương thức thanh toán</label>
                        <div className="payment-options">
                          <div
                            className={`payment-box ${checkoutForm.paymentMethod === 'COD' ? 'active' : ''}`}
                            onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: 'COD' })}
                          >
                            📦 Thanh toán COD
                          </div>
                          <div
                            className={`payment-box ${checkoutForm.paymentMethod === 'Bank Transfer' ? 'active' : ''}`}
                            onClick={() => setCheckoutForm({ ...checkoutForm, paymentMethod: 'Bank Transfer' })}
                          >
                            🏦 Chuyển khoản QR
                          </div>
                        </div>
                      </div>

                      {checkoutForm.paymentMethod === 'Bank Transfer' && (
                        <div className="bank-info-panel">
                          <p><strong>Số tài khoản:</strong> 999988886666 (MB Bank)</p>
                          <p><strong>Chủ tài khoản:</strong> AURA SMART STORE</p>
                          <p><strong>Nội dung CK:</strong> {checkoutForm.customerPhone || '0912345678'}</p>
                          <div className="bank-qr-simulation">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=STK:999988886666-MONEY:${cartTotal}`}
                              alt="Mã QR Thanh Toán"
                              className="bank-qr-img"
                            />
                          </div>
                          <label className="form-label" style={{ marginTop: '0.5rem' }}>Tải lên ảnh biên lai chuyển khoản *</label>
                          <input type="file" accept="image/*" className="form-input" onChange={handleReceiptUpload} />
                          {checkoutForm.paymentReceiptUrl && <p style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700' }}>✓ Đã đính kèm ảnh biên lai</p>}
                        </div>
                      )}

                      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', marginTop: '1rem' }}>
                        Xác Nhận Đặt Hàng ({formatVND(cartTotal)})
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* CUSTOMER AUTH PAGE */}
        {page === 'user-auth' && (
          <div className="login-container">
            <div className="login-card">
              <div className="login-header">
                <h2>{isRegistering ? 'Đăng Ký Khách Hàng' : 'Đăng Nhập Khách Hàng'}</h2>
                <p>{isRegistering ? 'Tạo tài khoản mới để đặt hàng & theo dõi đơn' : 'Đăng nhập tài khoản cá nhân của bạn'}</p>
              </div>

              {/* INLINE AUTH ERROR BANNER */}
              {authError && (
                <div className="auth-error-banner">
                  <span>⚠️</span>
                  <span>{authError}</span>
                </div>
              )}

              {!isRegistering ? (
                <form onSubmit={handleUserLogin}>
                  <div className="form-group">
                    <label className="form-label">Tên đăng nhập *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="Ví dụ: nguyenvana"
                      value={userLoginForm.username}
                      onChange={(e) => { setAuthError(''); setUserLoginForm({ ...userLoginForm, username: e.target.value }); }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu *</label>
                    <input
                      type="password"
                      className="form-input"
                      required
                      placeholder="Nhập mật khẩu"
                      value={userLoginForm.password}
                      onChange={(e) => { setAuthError(''); setUserLoginForm({ ...userLoginForm, password: e.target.value }); }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    Đăng Nhập Khách Hàng
                  </button>
                  <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem' }}>
                    Chưa có tài khoản?{' '}
                    <a style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }} onClick={() => { setAuthError(''); setIsRegistering(true); }}>
                      Đăng ký ngay
                    </a>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleUserRegister}>
                  <div className="form-group">
                    <label className="form-label">Tên đăng nhập *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="Ví dụ: nguyenvana"
                      value={userRegisterForm.username}
                      onChange={(e) => { setAuthError(''); setUserRegisterForm({ ...userRegisterForm, username: e.target.value }); }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu *</label>
                    <input
                      type="password"
                      className="form-input"
                      required
                      placeholder="Nhập mật khẩu bí mật"
                      value={userRegisterForm.password}
                      onChange={(e) => { setAuthError(''); setUserRegisterForm({ ...userRegisterForm, password: e.target.value }); }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Họ và tên người dùng *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={userRegisterForm.fullName}
                      onChange={(e) => { setAuthError(''); setUserRegisterForm({ ...userRegisterForm, fullName: e.target.value }); }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input
                      type="tel"
                      className="form-input"
                      required
                      placeholder="Ví dụ: 0912345678"
                      value={userRegisterForm.phone}
                      onChange={(e) => { setAuthError(''); setUserRegisterForm({ ...userRegisterForm, phone: e.target.value }); }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa chỉ giao hàng *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="Ví dụ: Số 123 Đường Cầu Giấy, Hà Nội"
                      value={userRegisterForm.address}
                      onChange={(e) => { setAuthError(''); setUserRegisterForm({ ...userRegisterForm, address: e.target.value }); }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email (Tùy chọn)</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Ví dụ: nguyenvana@gmail.com"
                      value={userRegisterForm.email}
                      onChange={(e) => { setAuthError(''); setUserRegisterForm({ ...userRegisterForm, email: e.target.value }); }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    Tạo Tài Khoản Khách Hàng
                  </button>
                  <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem' }}>
                    Đã có tài khoản?{' '}
                    <a style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }} onClick={() => { setAuthError(''); setIsRegistering(false); }}>
                      Quay lại Đăng nhập
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}

        {/* MY ORDERS PAGE */}
        {page === 'my-orders' && userToken && (
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Đơn Hàng Của Tôi</h2>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.88rem' }} onClick={fetchUserOrders}>
                🔄 Làm Mới Trạng Thái Đơn
              </button>
            </div>

            {userMyOrders.length === 0 ? (
              <div className="cart-empty" style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid var(--border-subtle)' }}>
                <h3>Bạn chưa có đơn hàng nào</h3>
                <p style={{ color: 'var(--text-muted)' }}>Hãy tham quan cửa hàng và đặt những thiết bị thông minh đầu tiên nhé.</p>
                <button className="btn btn-primary" onClick={() => setPage('shop')}>Ghé thăm Cửa hàng</button>
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã Đơn</th>
                      <th>Ngày Đặt</th>
                      <th>Người Nhận</th>
                      <th>Số Điện Thoại</th>
                      <th>Tổng Tiền</th>
                      <th>Thanh Toán</th>
                      <th>Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userMyOrders.map(ord => (
                      <tr key={ord.id}>
                        <td><strong>#{ord.id}</strong></td>
                        <td>{new Date(ord.created_at).toLocaleDateString('vi-VN')}</td>
                        <td>{ord.customer_name}</td>
                        <td>{ord.customer_phone}</td>
                        <td><strong>{formatVND(ord.total_amount)}</strong></td>
                        <td>{ord.payment_method}</td>
                        <td>
                          <span className={`badge badge-${(ord.status || 'pending').toLowerCase()}`}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS PAGE */}
        {page === 'success' && successOrder && (
          <div className="success-screen">
            <svg className="success-icon-svg" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
            <h2>Đặt Hàng Thành Công!</h2>
            <p>Mã đơn hàng của bạn: <strong>#{successOrder.id}</strong></p>
            <p style={{ color: 'var(--text-muted)' }}>Cảm ơn quý khách <strong>{successOrder.customer_name}</strong> đã tin tưởng Aura Smart. Bộ phận hỗ trợ sẽ liên hệ xác nhận đơn hàng sớm nhất.</p>
            <button className="btn btn-primary" style={{ padding: '0.8rem 2rem' }} onClick={() => setPage('shop')}>
              Tiếp Tục Mua Sắm
            </button>
          </div>
        )}

        {/* ADMIN LOGIN PAGE */}
        {page === 'login' && (
          <div className="login-container">
            <div className="login-card">
              <div className="login-header">
                <h2>Admin Gateway</h2>
                <p>Đăng nhập hệ thống quản trị Aura Smart</p>
              </div>
              <form onSubmit={handleAdminLogin}>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập Admin</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Đăng Nhập Admin
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {page === 'admin' && adminToken && (
          <div className="admin-layout">
            <aside className="admin-sidebar">
              <div className="admin-sidebar-title">Quản Lý Hệ Thống</div>
              <div
                className={`admin-nav-item ${adminTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setAdminTab('dashboard')}
              >
                📊 Tổng Quan
              </div>
              <div
                className={`admin-nav-item ${adminTab === 'orders' ? 'active' : ''}`}
                onClick={() => setAdminTab('orders')}
              >
                📦 Quản Lý Đơn Hàng
              </div>
              <div
                className={`admin-nav-item ${adminTab === 'products' ? 'active' : ''}`}
                onClick={() => setAdminTab('products')}
              >
                🎛️ Quản Lý Sản Phẩm
              </div>
              <div
                className={`admin-nav-item ${adminTab === 'users' ? 'active' : ''}`}
                onClick={() => setAdminTab('users')}
              >
                👥 Quản Lý Người Dùng
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleAdminLogout}>
                  Đăng Xuất Admin
                </button>
              </div>
            </aside>

            <section className="admin-main">
              {/* ADMIN TAB: DASHBOARD WITH BEAUTIFUL HIGH-END SVG CHART */}
              {adminTab === 'dashboard' && (
                <>
                  <div className="kpi-grid">
                    <div className="kpi-card">
                      <span className="kpi-title">Tổng Doanh Thu</span>
                      <span className="kpi-value">{formatVND(adminStats.totalSales)}</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-title">Số Đơn Hàng</span>
                      <span className="kpi-value">{adminStats.totalOrders}</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-title">Đơn Chờ Duyệt</span>
                      <span className="kpi-value" style={{ color: 'var(--accent-amber)' }}>{adminStats.pendingOrders}</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-title">Tổng Sản Phẩm</span>
                      <span className="kpi-value">{adminStats.totalProducts}</span>
                    </div>
                  </div>

                  {/* HIGH-END SVG BAR & TREND LINE CHART */}
                  <div className="chart-container">
                    <div className="chart-header">
                      <h3 className="chart-title">📈 Doanh Thu 7 Ngày Gần Nhất (VND)</h3>
                      <span className="badge badge-completed">Cập nhật thời gian thực</span>
                    </div>
                    
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <svg viewBox="0 0 640 240" style={{ width: '100%', minWidth: '550px', height: '220px' }}>
                        <defs>
                          <linearGradient id="emeraldBarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.3" />
                          </linearGradient>
                          <linearGradient id="areaTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                          </linearGradient>
                          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>

                        {/* Background Grid Lines */}
                        <line x1="50" y1="30" x2="610" y2="30" stroke="rgba(16, 185, 129, 0.15)" strokeDasharray="4" />
                        <line x1="50" y1="75" x2="610" y2="75" stroke="rgba(16, 185, 129, 0.15)" strokeDasharray="4" />
                        <line x1="50" y1="120" x2="610" y2="120" stroke="rgba(16, 185, 129, 0.15)" strokeDasharray="4" />
                        <line x1="50" y1="165" x2="610" y2="165" stroke="rgba(16, 185, 129, 0.15)" strokeDasharray="4" />
                        <line x1="50" y1="195" x2="610" y2="195" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" />

                        {/* Y-Axis Labels */}
                        <text x="40" y="35" fill="var(--text-muted)" fontSize="11" textAnchor="end">1.5M</text>
                        <text x="40" y="80" fill="var(--text-muted)" fontSize="11" textAnchor="end">1.0M</text>
                        <text x="40" y="125" fill="var(--text-muted)" fontSize="11" textAnchor="end">0.5M</text>
                        <text x="40" y="170" fill="var(--text-muted)" fontSize="11" textAnchor="end">0.2M</text>

                        {/* Bar Data & Trend Line */}
                        {[
                          { day: 'Thứ 2', val: 50, label: '450k' },
                          { day: 'Thứ 3', val: 85, label: '780k' },
                          { day: 'Thứ 4', val: 65, label: '620k' },
                          { day: 'Thứ 5', val: 110, label: '1.1M' },
                          { day: 'Thứ 6', val: 140, label: '1.4M' },
                          { day: 'Thứ 7', val: 160, label: '1.6M' },
                          { day: 'Chủ Nhật', val: 125, label: '1.25M' }
                        ].map((item, idx) => {
                          const x = 80 + idx * 75;
                          const height = item.val;
                          const y = 195 - height;
                          return (
                            <g key={idx}>
                              {/* Bar Pillar */}
                              <rect
                                x={x - 18}
                                y={y}
                                width="36"
                                height={height}
                                rx="8"
                                fill="url(#emeraldBarGrad)"
                                filter="url(#glowEffect)"
                              />
                              {/* Top Value Label */}
                              <text x={x} y={y - 8} fill="var(--primary)" fontSize="11" fontWeight="800" textAnchor="middle">
                                {item.label}
                              </text>
                              {/* X-Axis Day Label */}
                              <text x={x} y="215" fill="var(--text-heading)" fontSize="12" fontWeight="700" textAnchor="middle">
                                {item.day}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                </>
              )}

              {/* ADMIN TAB: ORDERS */}
              {adminTab === 'orders' && (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã Đơn</th>
                        <th>Khách Hàng</th>
                        <th>Số Điện Thoại</th>
                        <th>Tổng Tiền</th>
                        <th>Thanh Toán</th>
                        <th>Trạng Thái</th>
                        <th>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminOrders.map(ord => (
                        <tr key={ord.id}>
                          <td><strong>#{ord.id}</strong></td>
                          <td>{ord.customer_name}</td>
                          <td>{ord.customer_phone}</td>
                          <td><strong>{formatVND(ord.total_amount)}</strong></td>
                          <td>{ord.payment_method}</td>
                          <td>
                            <span className={`badge badge-${(ord.status || 'pending').toLowerCase()}`}>
                              {ord.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                              onClick={() => {
                                setSelectedOrder({ order: ord, items: [] });
                                setSelectedStatus(ord.status || 'Pending');
                              }}
                            >
                              Chi Tiết & Sửa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ADMIN TAB: PRODUCTS */}
              {adminTab === 'products' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>Danh Sách Thiết Bị ({products.length})</h3>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setProductForm({ id: null, name: '', description: '', price: '', category: 'Lighting', stock: '', imageUrl: '' });
                        setShowProductModal(true);
                      }}
                    >
                      + Thêm Sản Phẩm Mới
                    </button>
                  </div>

                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Hình Ảnh</th>
                          <th>Tên Thiết Bị</th>
                          <th>Danh Mục</th>
                          <th>Giá Bán</th>
                          <th>Tồn Kho</th>
                          <th>Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map(p => (
                          <tr key={p.id}>
                            <td>#{p.id}</td>
                            <td>
                              <img src={getImageUrl(p.image_url)} alt={p.name} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                            </td>
                            <td><strong>{p.name}</strong></td>
                            <td><span className="product-category-tag" style={{ position: 'static' }}>{p.category}</span></td>
                            <td>{formatVND(p.price)}</td>
                            <td>{p.stock} chiếc</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                  onClick={() => {
                                    setProductForm({
                                      id: p.id,
                                      name: p.name,
                                      description: p.description || '',
                                      price: p.price,
                                      category: p.category,
                                      stock: p.stock,
                                      imageUrl: p.image_url || ''
                                    });
                                    setShowProductModal(true);
                                  }}
                                >
                                  ✏️ Sửa
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                                  onClick={() => handleDeleteProduct(p.id)}
                                >
                                  🗑️ Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ADMIN TAB: USERS */}
              {adminTab === 'users' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3>Quản Lý Tài Khoản Khách Hàng ({adminUsers.length})</h3>
                  </div>

                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Tên Đăng Nhập</th>
                          <th>Họ và Tên</th>
                          <th>Số Điện Thoại</th>
                          <th>Email</th>
                          <th>Địa Chỉ</th>
                          <th>Trạng Thái</th>
                          <th>Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map(user => (
                          <tr key={user.id}>
                            <td>#{user.id}</td>
                            <td><strong>{user.username}</strong></td>
                            <td>{user.full_name || 'N/A'}</td>
                            <td>{user.phone || 'N/A'}</td>
                            <td>{user.email || 'N/A'}</td>
                            <td>{user.address || 'N/A'}</td>
                            <td>
                              <span className={`badge ${user.is_active ? 'badge-completed' : 'badge-cancelled'}`}>
                                {user.is_active ? 'Đang hoạt động' : 'Bị vô hiệu hóa'}
                              </span>
                            </td>
                            <td>
                              {user.role === 'admin' ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '800' }}>🛡️ Quản trị viên</span>
                              ) : (
                                <button
                                  className={`btn ${user.is_active ? 'btn-danger' : 'btn-primary'}`}
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                                  onClick={() => handleToggleUserActive(user.id)}
                                >
                                  {user.is_active ? '🚫 Khóa tài khoản' : '🔑 Mở khóa'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* ADMIN ORDER DETAIL MODAL WITH CONFIRM / SAVE BUTTON */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            <h3 style={{ fontFamily: 'var(--font-main)', marginBottom: '1.25rem', fontSize: '1.4rem', color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem' }}>
              Chi Tiết Đơn Hàng #{selectedOrder.order.id}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', fontSize: '0.95rem', color: 'var(--text-body)' }}>
              <p><strong>Khách hàng:</strong> {selectedOrder.order.customer_name}</p>
              <p><strong>Số điện thoại:</strong> {selectedOrder.order.customer_phone}</p>
              <p><strong>Địa chỉ giao hàng:</strong> {selectedOrder.order.customer_address}</p>
              <p><strong>Tổng giá trị đơn hàng:</strong> <span style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1.1rem' }}>{formatVND(selectedOrder.order.total_amount)}</span></p>
              <p><strong>Hình thức thanh toán:</strong> {selectedOrder.order.payment_method}</p>
              <p>
                <strong>Trạng thái hiện tại:</strong>{' '}
                <span className={`badge badge-${(selectedOrder.order.status || 'pending').toLowerCase()}`}>
                  {selectedOrder.order.status}
                </span>
              </p>

              {selectedOrder.order.payment_receipt_url && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontWeight: '700', marginBottom: '0.4rem' }}>Biên lai chuyển khoản kèm theo:</p>
                  <img src={getImageUrl(selectedOrder.order.payment_receipt_url)} alt="Biên lai" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} />
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <label className="form-label" style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>
                Cập nhật trạng thái đơn hàng:
              </label>
              <select
                className="form-input"
                style={{ fontSize: '0.95rem', padding: '0.8rem', marginBottom: '1.25rem' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="Pending">Pending (Chờ xác nhận)</option>
                <option value="Confirmed">Confirmed (Đã xác nhận)</option>
                <option value="Shipping">Shipping (Đang giao hàng)</option>
                <option value="Completed">Completed (Hoàn thành)</option>
                <option value="Cancelled">Cancelled (Đã hủy)</option>
              </select>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.9rem', fontSize: '1rem', fontWeight: '800' }}
                  onClick={handleSaveOrderStatus}
                >
                  ✓ Xác Nhận & Lưu Trạng Thái Đơn Hàng
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.9rem 1.4rem' }}
                  onClick={() => setSelectedOrder(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PRODUCT EDIT/CREATE MODAL */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowProductModal(false)}>×</button>
            <h3 style={{ fontFamily: 'var(--font-main)', marginBottom: '1.25rem', fontSize: '1.4rem', color: 'var(--text-heading)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.6rem' }}>
              {productForm.id ? `Chỉnh Sửa Thiết Bị #${productForm.id}` : 'Thêm Thiết Bị Mới'}
            </h3>
            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label className="form-label">Tên sản phẩm *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Nhập tên sản phẩm..."
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả sản phẩm</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Mô tả chi tiết về sản phẩm..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Giá bán (VND) *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    placeholder="250000"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Số lượng tồn kho *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    placeholder="50"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Danh mục sản phẩm *</label>
                <select
                  className="form-input"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                >
                  <option value="Lighting">💡 Lighting (Chiếu sáng)</option>
                  <option value="Security">🔒 Security (An ninh)</option>
                  <option value="Climate">❄️ Climate (Điều hòa)</option>
                  <option value="Control">🎛️ Control (Điều khiển)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tải lên ảnh sản phẩm mới</label>
                <input type="file" accept="image/*" className="form-input" onChange={handleProductImageUpload} />
                {productForm.imageUrl && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <img src={getImageUrl(productForm.imageUrl)} alt="Preview" style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>✓ Đã chọn ảnh sản phẩm</span>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.25rem', padding: '0.85rem' }}>
                {productForm.id ? 'Lưu Cập Nhật Chi Tiết' : 'Tạo Sản Phẩm Mới'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AURA AI FLOATING CHATBOT WIDGET */}
      <button className="chatbot-trigger-btn" onClick={() => setChatOpen(!chatOpen)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>

      {chatOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/></svg>
              Aura AI Assistant
            </div>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setChatOpen(false)}>
              ×
            </button>
          </div>

          <div className="chatbot-messages">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.sender}`}>
                {renderChatMessageText(msg.text)}
              </div>
            ))}
            {chatLoading && <div className="chat-bubble bot">Đang suy nghĩ...</div>}
          </div>

          <form onSubmit={handleSendChatMessage} className="chatbot-input-area">
            <input
              type="text"
              className="chatbot-input"
              placeholder="Hỏi Aura AI về thiết bị..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 0.9rem' }}>
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
