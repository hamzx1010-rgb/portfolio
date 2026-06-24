const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== SETUP STORAGE =====================
const DATA_DIR = './data';
const UPLOADS_DIR = './uploads';
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, '[]');
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');

const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ===================== MIDDLEWARE =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ===================== IMAGE UPLOAD =====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = uuidv4() + path.extname(file.originalname);
    cb(null, unique);
  }
});
const upload = multer({ storage });

// ===================== ADMIN PASSWORD =====================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ===================== API ROUTES =====================

// Get all products
app.get('/api/products', (req, res) => {
  try {
    res.json(readJSON(PRODUCTS_FILE));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Add a product
app.post('/api/products', upload.array('images', 5), (req, res) => {
  const { name, price, old, discount, category } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  try {
    const products = readJSON(PRODUCTS_FILE);
    const images = req.files && req.files.length
      ? req.files.map(f => `/uploads/${f.filename}`)
      : [];

    const product = {
      id: uuidv4(),
      name,
      price: parseFloat(price),
      old: parseFloat(old || 0),
      discount: parseInt(discount || 0),
      category,
      images,
      createdAt: new Date().toISOString()
    };

    products.push(product);
    writeJSON(PRODUCTS_FILE, products);
    res.status(201).json(product);
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
  try {
    const products = readJSON(PRODUCTS_FILE);
    const index = products.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[index];

    // Delete image files
    if (product.images && product.images.length) {
      product.images.forEach(img => {
        if (img.startsWith('/uploads/')) {
          const imagePath = path.join(__dirname, img);
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }
      });
    }

    products.splice(index, 1);
    writeJSON(PRODUCTS_FILE, products);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Submit an order
app.post('/api/orders', (req, res) => {
  const { product, price, qty, customer, phone, email, websiteType } = req.body;
  if (!product || !price || !customer || !phone) {
    return res.status(400).json({ error: 'Product, price, customer, and phone are required' });
  }

  try {
    const orders = readJSON(ORDERS_FILE);
    const order = {
      id: uuidv4(),
      product,
      price: parseFloat(price),
      qty: parseInt(qty || 1),
      customer,
      phone,
      email: email || '',
      websiteType: websiteType || '',
      date: new Date().toLocaleDateString('en-US'),
      createdAt: new Date().toISOString()
    };

    orders.unshift(order);
    writeJSON(ORDERS_FILE, orders);
    res.status(201).json({ message: 'Order received', order });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to submit order' });
  }
});

// Get all orders (protected by admin password)
app.get('/api/orders', (req, res) => {
  const password = req.headers['x-admin-password'];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    res.json(readJSON(ORDERS_FILE));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Admin login check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Wrong password' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ===================== START SERVER =====================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔐 Admin page: http://localhost:${PORT}/admin.html`);
});
