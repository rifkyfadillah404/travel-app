const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all users in group
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groupId = req.user.groupId;

    // If user has no group, return empty array
    if (!groupId) {
      return res.json([]);
    }

    const [users] = await pool.query(
      `SELECT id, name, phone, role, is_online, is_panic, avatar,
              last_latitude as latitude, last_longitude as longitude, last_location_at as location_timestamp
       FROM users 
       WHERE group_id = ?
       ORDER BY name`,
      [groupId]
    );

    const formattedUsers = users.map(user => ({
      id: user.id.toString(),
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      groupId: groupId.toString(),
      isOnline: Boolean(user.is_online),
      isPanic: Boolean(user.is_panic),
      location: user.latitude ? {
        lat: parseFloat(user.latitude),
        lng: parseFloat(user.longitude),
        timestamp: new Date(user.location_timestamp).getTime()
      } : null
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { avatar } = req.body;
    const userId = req.user.id;
    const groupId = req.user.groupId;

    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar, userId]);

    // Broadcast update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${groupId}`).emit('user-profile-updated', {
        userId,
        avatar
      });
    }

    res.json({ message: 'Profile berhasil diupdate', avatar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user location
router.post('/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;

    await pool.query(
      'INSERT INTO user_locations (user_id, latitude, longitude) VALUES (?, ?, ?)',
      [userId, latitude, longitude]
    );

    // Update user online status and cache last location
    await pool.query(
      'UPDATE users SET is_online = TRUE, last_latitude = ?, last_longitude = ?, last_location_at = NOW() WHERE id = ?',
      [latitude, longitude, userId]
    );

    res.json({ message: 'Lokasi berhasil diupdate' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT *, last_latitude as latitude, last_longitude as longitude, last_location_at as location_timestamp
       FROM users 
       WHERE id = ? AND group_id = ?`,
      [req.params.id, req.user.groupId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];
    res.json({
      id: user.id.toString(),
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      groupId: user.group_id.toString(),
      isOnline: Boolean(user.is_online),
      isPanic: Boolean(user.is_panic),
      location: user.latitude ? {
        lat: parseFloat(user.latitude),
        lng: parseFloat(user.longitude),
        timestamp: new Date(user.location_timestamp).getTime()
      } : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
