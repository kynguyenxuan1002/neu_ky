const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { sanitizeString } = require('../middlewares/auth');

// Get all products
const getProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải sản phẩm.' });
  }
};

// Get single product detail
const getProductDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải chi tiết sản phẩm.' });
  }
};

// Handle Image Base64 Upload
const uploadImage = async (req, res) => {
  try {
    const { base64Data, filename } = req.body;
    if (!base64Data || !filename) {
      return res.status(400).json({ message: 'Vui lòng cung cấp dữ liệu ảnh base64 và tên file.' });
    }

    const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `upload_${Date.now()}_${cleanFilename}`;
    const uploadsDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueFilename);
    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/${uniqueFilename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi tải lên ảnh.' });
  }
};

// Gemini & Fallback AI Chatbot (Supports short-term chat history memory)
const handleAIChatbot = async (req, res) => {
  const message = req.body.message;
  const history = req.body.history || [];

  if (!message) {
    return res.status(400).json({ message: 'Vui lòng nhập tin nhắn.' });
  }

  try {
    // 1. Fetch available products list
    const productsResult = await pool.query('SELECT name, price, category, description, stock FROM products');
    const productContext = productsResult.rows.map(p => 
      `- ${p.name} (Danh mục: ${p.category}, Giá: ${p.price} VND, Mô tả: ${p.description || 'Không'}, Tồn kho: ${p.stock})`
    ).join('\n');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
      return res.json({ 
        response: `🤖 [Aura AI Trợ Lý]: Xin chào! Hiện tại hệ thống chưa cấu hình GEMINI_API_KEY trong file backend/.env.
Dù vậy, tôi đã quét danh mục sản phẩm và thấy cửa hàng đang có các thiết bị: ${productsResult.rows.map(p => p.name).join(', ')}.
Bạn vừa hỏi: "${message}". Hãy bổ sung Gemini API Key để kích hoạt tư vấn thông minh nhé!`
      });
    }

    // 2. Format short-term chat history as conversation context
    const chatHistoryContext = history
      .slice(-8) // Take last 8 message bubbles for context size limit safety
      .map(msg => `${msg.sender === 'user' ? 'Khách hàng' : 'Aura AI'}: ${msg.text}`)
      .join('\n');

    // 3. Initialize Gemini Client
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const ai = new GoogleGenerativeAI(apiKey);
    
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `Bạn là trợ lý ảo thân thiện, thông minh của cửa hàng Aura Smart. Hãy hỗ trợ tư vấn các sản phẩm sau đây cho khách hàng:\n${productContext}\n\nLưu ý quan trọng:\n- Chỉ tư vấn các sản phẩm có trong danh sách trên.\n- Trả lời bằng tiếng Việt lịch sự, ngắn gọn và hữu ích.\n- Nếu khách hỏi về sản phẩm không có, hãy lịch sự từ chối và giới thiệu các sản phẩm có sẵn.\n- Kế thừa và tham chiếu ngữ cảnh từ cuộc trò chuyện trước đó nếu cần.`
    });

    const fullPrompt = `Lịch sử hội thoại trước đó giữa Khách hàng và Aura AI:\n${chatHistoryContext || '(Chưa có hội thoại trước đó)'}\n\nKhách hàng hỏi câu mới nhất: "${message}"\nHãy trả lời câu hỏi mới nhất này một cách tự nhiên và liên kết với ngữ cảnh hội thoại trên:`;

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();
    res.json({ response: responseText });
  } catch (error) {
    console.error('Chatbot API Error:', error);
    
    // Smart RAG Fallback Engine if network or Gemini API fails
    try {
      const msgLower = (message || '').toLowerCase();
      const productsResult = await pool.query('SELECT name, price, category, description, stock FROM products');
      const matched = productsResult.rows.filter(p => 
        msgLower.includes(p.name.toLowerCase()) || 
        msgLower.includes(p.category.toLowerCase()) ||
        (p.description && msgLower.split(' ').some(word => word.length > 3 && p.description.toLowerCase().includes(word)))
      );

      let replyText = '';
      if (matched.length > 0) {
        const productList = matched.map(p => `• **${p.name}** (${p.category}): ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)} - ${p.stock > 0 ? 'Còn hàng' : 'Hết hàng'}`).join('\n');
        replyText = `🌱 **Aura AI Trợ Lý**: Dựa trên tìm kiếm cửa hàng, tôi tìm thấy các thiết bị phù hợp cho bạn:\n\n${productList}\n\nBạn có muốn tìm hiểu thêm về thiết bị nào không?`;
      } else {
        const topProducts = productsResult.rows.slice(0, 3).map(p => `• ${p.name}`).join('\n');
        replyText = `🌱 **Aura AI Trợ Lý**: Xin chào! Tôi có thể tư vấn các giải pháp nhà thông minh cho bạn. Hiện tại các thiết bị nổi bật tại cửa hàng gồm:\n\n${topProducts}\n\nBạn có thể hỏi tôi chi tiết về Đèn thông minh, Camera an ninh, Khóa vân tay hay Điều hòa nhé!`;
      }

      return res.json({ response: replyText });
    } catch (dbErr) {
      return res.json({ response: '🌱 **Aura AI Trợ Lý**: Xin chào! Tôi có thể giúp bạn chọn các thiết bị Smart Home tốt nhất cho ngôi nhà sống xanh. Bạn cần hỗ trợ sản phẩm gì hôm nay?' });
    }
  }
};

// Create new product (Admin)
const createProduct = async (req, res) => {
  const name = sanitizeString(req.body.name);
  const description = sanitizeString(req.body.description);
  const category = sanitizeString(req.body.category);
  const { price, imageUrl, stock } = req.body;

  if (!name || price === undefined || !category || stock === undefined) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ Tên, Giá, Danh mục và Số lượng sản phẩm.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, image_url, category, stock) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, imageUrl || '/uploads/philips_hue_bulb.png', category, stock]
    );
    res.status(201).json({ message: 'Thêm sản phẩm thành công.', product: result.rows[0] });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi thêm sản phẩm.' });
  }
};

// Update product (Admin)
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const name = sanitizeString(req.body.name);
  const description = sanitizeString(req.body.description);
  const category = sanitizeString(req.body.category);
  const { price, imageUrl, stock } = req.body;

  if (!name || price === undefined || !category || stock === undefined) {
    return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ Tên, Giá, Danh mục và Số lượng sản phẩm.' });
  }

  try {
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, image_url = $4, category = $5, stock = $6 
       WHERE id = $7 RETURNING *`,
      [name, description, price, imageUrl, category, stock, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để cập nhật.' });
    }

    res.json({ message: 'Cập nhật sản phẩm thành công.', product: result.rows[0] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật sản phẩm.' });
  }
};

// Delete product (Admin)
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa.' });
    }
    res.json({ message: 'Xóa sản phẩm thành công.', product: result.rows[0] });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Lỗi hệ thống khi xóa sản phẩm.' });
  }
};

module.exports = {
  getProducts,
  getProductDetail,
  uploadImage,
  handleAIChatbot,
  createProduct,
  updateProduct,
  deleteProduct
};
