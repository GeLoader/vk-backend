const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Path to JSON file
const DATA_FILE = path.join(__dirname, 'yoshon-products.json');

// Verify data file exists
if (!fs.existsSync(DATA_FILE)) {
  console.error('Error: yoshon-products.json not found!');
  console.error(`Expected location: ${DATA_FILE}`);
  process.exit(1);
}

// Helper function to read products
const readProducts = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products:', error);
    return [];
  }
};

// Helper function to write products
const writeProducts = (products) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing products:', error);
    return false;
  }
};

// Admin password (change this to something secure)
const ADMIN_PASSWORD = 'yoshon2024';

// Middleware to check admin password
const checkAdminPassword = (req, res, next) => {
  const password = req.headers['x-admin-password'] || req.body.password;
  
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// ============================================
// PUBLIC ROUTES (No password required)
// ============================================

// GET all products
app.get('/api/products', (req, res) => {
  try {
    const products = readProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ============================================
// ADMIN ROUTES (Password required)
// ============================================

// ADD product
app.post('/api/products', checkAdminPassword, (req, res) => {
  try {
    const { Brand, 'Product Name': ProductName, Yoshon } = req.body;

    // Validation
    if (!Brand || !ProductName) {
      return res.status(400).json({ error: 'Brand and Product Name are required' });
    }

    const products = readProducts();
    const newProduct = {
      Brand,
      'Product Name': ProductName,
      Yoshon: Yoshon || 'Status N/A Yet'
    };

    products.push(newProduct);

    if (writeProducts(products)) {
      res.status(201).json({
        message: 'Product added successfully',
        product: newProduct,
        totalProducts: products.length
      });
    } else {
      res.status(500).json({ error: 'Failed to save product' });
    }
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// UPDATE product
app.put('/api/products/:index', checkAdminPassword, (req, res) => {
  try {
    const { index } = req.params;
    const { Brand, 'Product Name': ProductName, Yoshon } = req.body;

    // Validation
    if (!Brand || !ProductName) {
      return res.status(400).json({ error: 'Brand and Product Name are required' });
    }

    const products = readProducts();
    const idx = parseInt(index);

    if (idx < 0 || idx >= products.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    products[idx] = {
      Brand,
      'Product Name': ProductName,
      Yoshon: Yoshon || 'Status N/A Yet'
    };

    if (writeProducts(products)) {
      res.json({
        message: 'Product updated successfully',
        product: products[idx]
      });
    } else {
      res.status(500).json({ error: 'Failed to save product' });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
app.delete('/api/products/:index', checkAdminPassword, (req, res) => {
  try {
    const { index } = req.params;
    const products = readProducts();
    const idx = parseInt(index);

    if (idx < 0 || idx >= products.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const deletedProduct = products[idx];
    products.splice(idx, 1);

    if (writeProducts(products)) {
      res.json({
        message: 'Product deleted successfully',
        product: deletedProduct,
        totalProducts: products.length
      });
    } else {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// BULK OPERATIONS

// Bulk update products (for replacing entire list)
app.post('/api/products/bulk/replace', checkAdminPassword, (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    if (writeProducts(products)) {
      res.json({
        message: 'Products replaced successfully',
        totalProducts: products.length
      });
    } else {
      res.status(500).json({ error: 'Failed to save products' });
    }
  } catch (error) {
    console.error('Error replacing products:', error);
    res.status(500).json({ error: 'Failed to replace products' });
  }
});

// ============================================
// HEALTH CHECK & INFO
// ============================================

app.get('/api/health', (req, res) => {
  try {
    const products = readProducts();
    res.json({
      status: 'ok',
      totalProducts: products.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   Yoshon Admin Server Started          ║
╚════════════════════════════════════════╝

📍 API URL: http://localhost:${PORT}
📁 Data File: ${DATA_FILE}
🔐 Admin Password: ${ADMIN_PASSWORD}

Available Routes:
  GET    /api/products              - Get all products
  POST   /api/products              - Add product (admin)
  PUT    /api/products/:index       - Update product (admin)
  DELETE /api/products/:index       - Delete product (admin)
  GET    /api/health                - Health check

Next Steps:
1. Update your React components to use:
   - GET http://localhost:${PORT}/api/products (public list)
   - POST/PUT/DELETE with x-admin-password header (admin)

2. Change the admin password in this file before deployment!

3. Deploy with:
   - Heroku
   - Railway
   - Render
   - DigitalOcean
   - AWS
`);
});

module.exports = app;