const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  });

  try {
    // Create database if not exists
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
    );
    console.log('✓ Database created/exists');

    // Select database
    await connection.execute(`USE \`${process.env.DB_NAME}\``);

    // Create products table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        Brand VARCHAR(255) NOT NULL,
        \`Product Name\` VARCHAR(255) NOT NULL,
        Yoshon VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_brand (Brand),
        UNIQUE KEY unique_product (Brand, \`Product Name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Products table created/exists');

    // Check if table is empty
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
    if (rows[0].count === 0) {
      console.log('ℹ Table is empty. Add products via admin panel or import from JSON.');
    } else {
      console.log(`ℹ Table contains ${rows[0].count} products`);
    }

    await connection.end();
    console.log('✓ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error initializing database:', error.message);
    process.exit(1);
  }
}

initDatabase();