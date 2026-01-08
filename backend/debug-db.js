require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'db_travel'
    });
    console.log('✅ Koneksi sukses!');
    await connection.end();
  } catch (err) {
    console.error('❌ Koneksi GAGAL:', err.message);
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.log('👉 Database tidak ditemukan. Lu harus buat database manual dulu di MySQL.');
    }
  }
}

test();
