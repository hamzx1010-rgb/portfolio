const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const PRODUCTS_FILE = path.join(ROOT, 'products.json');
const ORDERS_FILE = path.join(ROOT, 'orders.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(PUBLIC_DIR));

function ensureJsonFile(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

function readJson(filePath, fallback = []) {
  try {
    ensureJsonFile(filePath, fallback);
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return fallback;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Failed to write ${filePath}:`, error);
    return false;
  }
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function createOrderId() {
  return 'ORD-' + Math.floor(100000 + Math.random() * 900000);
}

ensureJsonFile(PRODUCTS_FILE, []);
ensureJsonFile(ORDERS_FILE, []);

app.get('/api/health', (req, res) => {
  const products = readJson(PRODUCTS_FILE, []);
  const orders = readJson(ORDERS_FILE, []);
  res.json({
    ok: true,
    products: products.length,
    orders: orders.length,
    time: new Date().toISOString()
  });
});

app.get('/api/products', (req, res) => {
  const products = readJson(PRODUCTS_FILE, []).sort((a, b) => (a.order || 999) - (b.order || 999));
  res.json(products);
});

app.get('/api/admin/products', (req, res) => {
  const products = readJson(PRODUCTS_FILE, []).sort((a, b) => (a.order || 999) - (b.order || 999));
  res.json(products);
});

app.post('/api/admin/products', (req, res) => {
  const products = readJson(PRODUCTS_FILE, []);
  const nextId = products.length ? Math.max(...products.map(p => p.id || 0)) + 1 : 1;

  const name = String(req.body.name || '').trim();
  const category = String(req.body.category || '').trim();
  const price = toNumber(req.body.price, NaN);
  const oldPrice = req.body.oldPrice === '' || req.body.oldPrice === null || req.body.oldPrice === undefined
    ? null
    : toNumber(req.body.oldPrice, NaN);
  const previewUrl = String(req.body.previewUrl || '').trim();
  const image = String(req.body.image || '').trim();
  const images = Array.isArray(req.body.images) ? req.body.images.slice(0, 10) : [];
  const premiumTitle = String(req.body.premiumTitle || 'Premium Website').trim();
  const premiumDescription = String(req.body.premiumDescription || '24/7 running support, maintenance, and monthly subscription service.').trim();
  const premiumExtraPrice = toNumber(req.body.premiumExtraPrice, 6000);
  const premiumFeatures = Array.isArray(req.body.premiumFeatures) ? req.body.premiumFeatures.slice(0, 20) : [];
  const featured = !!req.body.featured;

  if (!name || !category || !Number.isFinite(price)) {
    return res.status(400).json({ error: 'Name, category and valid price are required.' });
  }

  const product = {
    id: nextId,
    name,
    category,
    price,
    oldPrice: Number.isFinite(oldPrice) ? oldPrice : null,
    featured,
    order: products.length + 1,
    previewUrl: previewUrl || '#',
    image: image || '',
    images,
    premiumTitle,
    premiumDescription,
    premiumExtraPrice,
    premiumFeatures,
    createdAt: new Date().toISOString()
  };

  products.push(product);
  const saved = writeJson(PRODUCTS_FILE, products);
  if (!saved) return res.status(500).json({ error: 'Could not save product.' });
  res.status(201).json(product);
});

app.put('/api/admin/products/:id', (req, res) => {
  const products = readJson(PRODUCTS_FILE, []);
  const id = Number(req.params.id);
  const index = products.findIndex(item => item.id === id);
  if (index === -1) return res.status(404).json({ error: 'Product not found.' });

  const current = products[index];
  const updated = {
    ...current,
    name: String(req.body.name ?? current.name).trim(),
    category: String(req.body.category ?? current.category).trim(),
    price: toNumber(req.body.price, current.price),
    oldPrice: req.body.oldPrice === '' || req.body.oldPrice === null || req.body.oldPrice === undefined
      ? null
      : toNumber(req.body.oldPrice, current.oldPrice ?? 0),
    featured: req.body.featured !== undefined ? !!req.body.featured : current.featured,
    previewUrl: String(req.body.previewUrl ?? current.previewUrl).trim(),
    image: String(req.body.image ?? current.image).trim(),
    images: Array.isArray(req.body.images) ? req.body.images.slice(0, 10) : (current.images || []),
    premiumTitle: String(req.body.premiumTitle ?? current.premiumTitle ?? 'Premium Website').trim(),
    premiumDescription: String(req.body.premiumDescription ?? current.premiumDescription ?? '24/7 running support, maintenance, and monthly subscription service.').trim(),
    premiumExtraPrice: toNumber(req.body.premiumExtraPrice, current.premiumExtraPrice ?? 6000),
    premiumFeatures: Array.isArray(req.body.premiumFeatures) ? req.body.premiumFeatures.slice(0, 20) : (current.premiumFeatures || []),
    updatedAt: new Date().toISOString()
  };

  if (!updated.name || !updated.category || !Number.isFinite(updated.price)) {
    return res.status(400).json({ error: 'Invalid product data.' });
  }

  products[index] = updated;
  const saved = writeJson(PRODUCTS_FILE, products);
  if (!saved) return res.status(500).json({ error: 'Could not update product.' });
  res.json(updated);
});

app.delete('/api/admin/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const products = readJson(PRODUCTS_FILE, []);
  const filtered = products.filter(item => item.id !== id);
  if (filtered.length === products.length) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  const normalized = filtered.map((item, index) => ({ ...item, order: index + 1 }));
  const saved = writeJson(PRODUCTS_FILE, normalized);
  if (!saved) return res.status(500).json({ error: 'Could not delete product.' });
  res.json({ success: true });
});

app.put('/api/admin/products/order', (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number) : [];
  if (!ids.length) return res.status(400).json({ error: 'No ids provided.' });

  const products = readJson(PRODUCTS_FILE, []);
  const orderMap = new Map(ids.map((id, index) => [id, index + 1]));
  const updated = products.map(item => ({ ...item, order: orderMap.get(item.id) || item.order || 999 }));
  const saved = writeJson(PRODUCTS_FILE, updated);
  if (!saved) return res.status(500).json({ error: 'Could not update product order.' });
  res.json({ success: true });
});

app.post('/api/orders', (req, res) => {
  const product = String(req.body.product || '').trim();
  const customer = String(req.body.customer || '').trim();
  const email = String(req.body.email || '').trim();
  const phone = String(req.body.phone || '').trim();
  const license = String(req.body.license || 'Single Site License').trim();
  const paymentMethod = String(req.body.paymentMethod || 'Card').trim();
  const qty = Math.max(1, toNumber(req.body.qty, 1));
  const price = Math.max(0, toNumber(req.body.price, 0));

  if (!product || !customer || !email) {
    return res.status(400).json({ error: 'Product, customer, and email are required.' });
  }

  const orders = readJson(ORDERS_FILE, []);
  const newOrder = {
    id: createOrderId(),
    product,
    customer,
    email,
    phone,
    license,
    qty,
    price,
    paymentMethod,
    date: new Date().toISOString()
  };

  orders.unshift(newOrder);
  const saved = writeJson(ORDERS_FILE, orders);
  if (!saved) return res.status(500).json({ error: 'Could not save order.' });
  res.status(201).json(newOrder);
});

app.get('/api/admin/orders', (req, res) => {
  const orders = readJson(ORDERS_FILE, []);
  res.json(orders);
});

app.delete('/api/admin/orders/:id', (req, res) => {
  const id = String(req.params.id);
  const orders = readJson(ORDERS_FILE, []);
  const filtered = orders.filter(item => String(item.id) !== id);
  if (filtered.length === orders.length) return res.status(404).json({ error: 'Order not found.' });
  const saved = writeJson(ORDERS_FILE, filtered);
  if (!saved) return res.status(500).json({ error: 'Could not delete order.' });
  res.json({ success: true });
});

app.get('/workspace-control-hamza', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Aura Digital server running on port ${PORT}`);
});