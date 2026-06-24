const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Helper functions to read/write JSON files safely
function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON:', err);
    return [];
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing JSON:', err);
  }
}

// --- STOREFRONT & ADMIN API ENDPOINTS ---

// GET products (Storefront & Admin)
app.get(['/api/products', '/api/admin/products'], (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  res.json(products);
});

// GET single product
app.get(['/api/products/:id', '/api/admin/products/:id'], (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  const p = products.find(x => x.id === parseInt(req.params.id));
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// POST new order (Storefront checkout)
app.post('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  const newOrder = {
    id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
    product: req.body.product || 'Unknown Template',
    customer: req.body.customer || 'Anonymous',
    phone: req.body.phone || req.body.email || 'N/A',
    size: req.body.size || req.body.license || 'Standard License',
    qty: parseInt(req.body.qty) || 1,
    price: parseInt(req.body.price) || 0,
    date: new Date().toISOString().split('T')[0]
  };
  orders.push(newOrder);
  writeJSON(ORDERS_FILE, orders);
  res.status(201).json(newOrder);
});

// GET orders (Admin)
app.get('/api/admin/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE);
  res.json(orders);
});

// DELETE order (Admin)
app.delete('/api/admin/orders/:id', (req, res) => {
  let orders = readJSON(ORDERS_FILE);
  orders = orders.filter(o => o.id !== req.params.id && String(o.id) !== String(req.params.id));
  writeJSON(ORDERS_FILE, orders);
  res.json({ success: true });
});

// POST new product (Admin)
app.post('/api/admin/products', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  const maxId = products.length ? Math.max(...products.map(p => p.id)) : 0;
  const newProduct = {
    id: maxId + 1,
    name: req.body.name || 'New Template',
    category: req.body.category || 'SaaS & AI',
    price: parseInt(req.body.price) || 49,
    old: parseInt(req.body.old) || 89,
    discount: parseInt(req.body.discount) || Math.round((1 - (req.body.price / req.body.old)) * 100) || 0,
    featured: req.body.featured || false,
    order: products.length + 1,
    previewUrl: req.body.previewUrl || 'https://example.com',
    images: req.body.images || []
  };
  products.push(newProduct);
  writeJSON(PRODUCTS_FILE, products);
  res.status(201).json(newProduct);
});

// PUT update product (Admin)
app.put('/api/admin/products/:id', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  products[index] = {
    ...products[index],
    name: req.body.name || products[index].name,
    category: req.body.category || products[index].category,
    price: parseInt(req.body.price) || products[index].price,
    old: parseInt(req.body.old) || products[index].old,
    discount: req.body.discount !== undefined ? parseInt(req.body.discount) : products[index].discount,
    featured: req.body.featured !== undefined ? req.body.featured : products[index].featured,
    previewUrl: req.body.previewUrl || products[index].previewUrl
  };
  writeJSON(PRODUCTS_FILE, products);
  res.json(products[index]);
});

// POST update product images (Admin)
app.post('/api/admin/products/:id/images', (req, res) => {
  const products = readJSON(PRODUCTS_FILE);
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  
  products[index].images = req.body.images || [];
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true });
});

// DELETE product (Admin)
app.delete('/api/admin/products/:id', (req, res) => {
  let products = readJSON(PRODUCTS_FILE);
  products = products.filter(p => p.id !== parseInt(req.params.id));
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true });
});

// PUT update featured products order (Admin)
app.put('/api/admin/products/order/update', (req, res) => {
  const productIds = req.body.productIds || [];
  const products = readJSON(PRODUCTS_FILE);
  
  productIds.forEach((id, index) => {
    const p = products.find(x => x.id === parseInt(id));
    if (p) p.order = index + 1;
  });
  
  writeJSON(PRODUCTS_FILE, products);
  res.json({ success: true });
});

// Fallback route for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 AURA DIGITAL TEMPLATES server running on port ${PORT}`);
});
