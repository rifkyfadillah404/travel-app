const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Generate unique QR token
function generateQRToken() {
  const prefix = 'ITJ';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Get all users (Admin only)
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Admin should see ALL users in the system, Pembimbing only sees their group
    let query = `
      SELECT u.id, u.name, u.phone, u.qr_token, u.role, u.group_id, u.is_online, u.is_panic, u.avatar, u.created_at,
             g.name as group_name
      FROM users u
      LEFT JOIN \`groups\` g ON u.group_id = g.id
    `;
    let params = [];

    if (req.user.role === 'pembimbing') {
      query += ' WHERE u.group_id = ?';
      params.push(req.user.groupId);
    }

    query += ' ORDER BY u.role DESC, u.name ASC';

    const [users] = await pool.query(query, params);

    res.json(users.map(user => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      qrToken: user.qr_token,
      role: user.role,
      avatar: user.avatar,
      groupId: user.group_id,
      groupName: user.group_name,
      isOnline: Boolean(user.is_online),
      isPanic: Boolean(user.is_panic),
      createdAt: user.created_at
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user (Admin only)
router.post('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, phone, password, role = 'jamaah' } = req.body;
    const groupId = req.user.groupId;

    // Validate
    if (!name || !phone) {
      return res.status(400).json({ message: 'Nama dan nomor telepon wajib diisi' });
    }

    // Check if phone already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Nomor telepon sudah terdaftar' });
    }

    // Hash password (default: 123456 if not provided)
    const userPassword = password || '123456';
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // Generate QR token
    const qrToken = generateQRToken();

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, phone, password, qr_token, group_id, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone, hashedPassword, qrToken, groupId, role]
    );

    res.status(201).json({
      message: 'User berhasil dibuat',
      user: {
        id: result.insertId,
        name,
        phone,
        qrToken,
        role,
        groupId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (Admin only)
router.put('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role } = req.body;

    // Check if user exists
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Update user
    await pool.query(
      'UPDATE users SET name = ?, phone = ?, role = ? WHERE id = ?',
      [name || users[0].name, phone || users[0].phone, role || users[0].role, id]
    );

    res.json({ message: 'User berhasil diupdate' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Can't delete yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Tidak bisa menghapus akun sendiri' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Regenerate QR token for user (Admin only)
router.post('/users/:id/regenerate-qr', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Generate new QR token
    const qrToken = generateQRToken();

    // Update user
    await pool.query('UPDATE users SET qr_token = ? WHERE id = ?', [qrToken, id]);

    res.json({
      message: 'QR Token berhasil di-regenerate',
      qrToken
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get QR token for specific user (Admin only)
router.get('/users/:id/qr', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.query(
      'SELECT id, name, phone, qr_token FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      qrToken: user.qr_token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all groups (Admin only)
router.get('/groups', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [groups] = await pool.query('SELECT * FROM `groups` ORDER BY departure_date DESC');
    res.json(groups.map(g => ({
      id: g.id,
      name: g.name,
      joinCode: g.join_code,
      departureDate: g.departure_date,
      returnDate: g.return_date,
      departureAirport: g.departure_airport,
      isActive: Boolean(g.is_active)
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update group (Pembimbing only)
router.put('/groups/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, destination, departureDate, returnDate } = req.body;

    // Only pembimbing can update group info
    if (req.user.role !== 'pembimbing') {
      return res.status(403).json({ message: 'Hanya pembimbing yang dapat mengubah informasi grup' });
    }

    // Fetch current group data to handle partial updates
    const [currentGroup] = await pool.query('SELECT * FROM `groups` WHERE id = ?', [id]);
    if (currentGroup.length === 0) {
      return res.status(404).json({ message: 'Grup tidak ditemukan' });
    }

    const finalName = name || currentGroup[0].name;
    const finalDestination = destination !== undefined ? destination : currentGroup[0].destination;
    const finalDeparture = departureDate || currentGroup[0].departure_date;
    const finalReturn = returnDate || currentGroup[0].return_date;

    await pool.query(
      'UPDATE `groups` SET name = ?, destination = ?, departure_date = ?, return_date = ? WHERE id = ?',
      [finalName, finalDestination, finalDeparture, finalReturn, id]
    );

    // Create notification for important info changes
    if (name || departureDate || returnDate) {
      await pool.query(
        'INSERT INTO notifications (group_id, title, content, type) VALUES (?, ?, ?, ?)',
        [
          id,
          'Perubahan Informasi Tour',
          `Informasi tour telah diperbarui. ${finalName}, Keberangkatan: ${finalDeparture}, Kepulangan: ${finalReturn}`,
          'info'
        ]
      );
    }

    // Create notification if destination (Note) changes
    if (destination !== undefined && destination !== currentGroup[0].destination) {
      await pool.query(
        'INSERT INTO notifications (group_id, title, content, type) VALUES (?, ?, ?, ?)',
        [
          id,
          'Catatan Baru dari Pembimbing',
          destination || 'Catatan telah dihapus.',
          'info'
        ]
      );
    }

    res.json({ message: 'Informasi grup berhasil diupdate' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new group (Admin only)
router.post('/groups', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, destination, departureDate, returnDate, departureAirport } = req.body;

    if (!name || !destination || !departureDate || !returnDate || !departureAirport) {
      return res.status(400).json({ message: 'Semua data wajib diisi' });
    }

    // Generate random join code (e.g. KOR-26A)
    const countryCode = destination.substring(0, 3).toUpperCase();
    const yearSuffix = new Date(departureDate).getFullYear().toString().substring(2);
    const randomChar = crypto.randomBytes(1).toString('hex').substring(0, 1).toUpperCase();
    const joinCode = `${countryCode}-${yearSuffix}${randomChar}`;

    const [result] = await pool.query(
      'INSERT INTO `groups` (name, destination, join_code, departure_date, return_date, departure_airport) VALUES (?, ?, ?, ?, ?, ?)',
      [name, destination, joinCode, departureDate, returnDate, departureAirport]
    );

    res.status(201).json({
      message: 'Grup berhasil dibuat',
      group: {
        id: result.insertId,
        name,
        destination,
        joinCode,
        departureDate,
        returnDate,
        departureAirport
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
