const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Login with phone & password
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Get user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        message: 'Nomor telepon tidak terdaftar',
        error_code: 'USER_NOT_FOUND'
      });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Password yang Anda masukkan salah',
        error_code: 'INVALID_PASSWORD'
      });
    }

    // Update online status
    await pool.query('UPDATE users SET is_online = TRUE WHERE id = ?', [user.id]);

    // Generate token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role, groupId: user.group_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        groupId: user.group_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login with QR Code
router.post('/login-qr', async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ message: 'QR Token diperlukan' });
    }

    // Get user by QR token
    const [users] = await pool.query(
      'SELECT * FROM users WHERE qr_token = ?',
      [qrToken]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'QR Code tidak valid' });
    }

    const user = users[0];

    // Update online status
    await pool.query('UPDATE users SET is_online = TRUE WHERE id = ?', [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role, groupId: user.group_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        groupId: user.group_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_online = FALSE WHERE id = ?', [req.user.id]);
    res.json({ message: 'Logout berhasil' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT *, last_latitude as latitude, last_longitude as longitude, last_location_at as location_timestamp
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      groupId: user.group_id,
      isOnline: user.is_online,
      isPanic: user.is_panic,
      location: user.latitude ? {
        lat: parseFloat(user.latitude),
        lng: parseFloat(user.longitude),
        timestamp: user.location_timestamp
      } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
