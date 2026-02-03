const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'vkkosher123';

// Middleware
app.use(cors());
app.use(bodyParser.json());

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
app.get('/api/products', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, Brand, `Product Name`, Yoshon FROM products ORDER BY id'
    );
    connection.release();
    
    // Convert to format frontend expects
    const products = rows.map(row => ({
      id: row.id,
      Brand: row.Brand,
      'Product Name': row['Product Name'],
      Yoshon: row.Yoshon
    }));
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ============================================
// ADMIN ROUTES (Password required)
// ============================================

// ADD product
app.post('/api/products', checkAdminPassword, async (req, res) => {
  try {
    const { Brand, 'Product Name': ProductName, Yoshon } = req.body;

    // Validation
    if (!Brand || !ProductName) {
      return res.status(400).json({ error: 'Brand and Product Name are required' });
    }

    const connection = await pool.getConnection();
    
    await connection.execute(
      'INSERT INTO products (Brand, `Product Name`, Yoshon) VALUES (?, ?, ?)',
      [Brand, ProductName, Yoshon || 'Status N/A Yet']
    );
    
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM products');
    connection.release();

    res.status(201).json({
      message: 'Product added successfully',
      totalProducts: result[0].count
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// UPDATE product
app.put('/api/products/:id', checkAdminPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const { Brand, 'Product Name': ProductName, Yoshon } = req.body;

    // Validation
    if (!Brand || !ProductName) {
      return res.status(400).json({ error: 'Brand and Product Name are required' });
    }

    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'UPDATE products SET Brand = ?, `Product Name` = ?, Yoshon = ? WHERE id = ?',
      [Brand, ProductName, Yoshon || 'Status N/A Yet', id]
    );

    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Product not found' });
    }

    connection.release();

    res.json({
      message: 'Product updated successfully',
      productId: id
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
app.delete('/api/products/:id', checkAdminPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    const [result] = await connection.execute(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({ error: 'Product not found' });
    }

    connection.release();

    res.json({
      message: 'Product deleted successfully',
      productId: id
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// IMPORT products from JSON
app.post('/api/products/import/json', checkAdminPassword, async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    const connection = await pool.getConnection();

    // Clear existing products
    await connection.execute('DELETE FROM products');

    // Insert new products
    for (const product of products) {
      await connection.execute(
        'INSERT INTO products (Brand, `Product Name`, Yoshon) VALUES (?, ?, ?)',
        [
          product.Brand || '',
          product['Product Name'] || '',
          product.Yoshon || 'Status N/A Yet'
        ]
      );
    }

    const [result] = await connection.execute('SELECT COUNT(*) as count FROM products');
    connection.release();

    res.json({
      message: 'Products imported successfully',
      totalProducts: result[0].count
    });
  } catch (error) {
    console.error('Error importing products:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
    connection.release();

    res.json({
      status: 'ok',
      totalProducts: rows[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed'
    });
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
║   Yoshon API Server Started            ║
║   MySQL Database Connected             ║
╚════════════════════════════════════════╝

📍 Server: http://localhost:${PORT}
🗄️  Database: ${process.env.DB_NAME}
🔐 Admin Password: ${ADMIN_PASSWORD}

Available Routes:
  GET    /api/products          - Get all products
  POST   /api/products          - Add product (admin)
  PUT    /api/products/:id      - Update product (admin)
  DELETE /api/products/:id      - Delete product (admin)
  POST   /api/products/import/json - Import from JSON (admin)
  GET    /api/health            - Health check
`);
});

module.exports = app;
