const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get current user's group
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groupId = req.user.groupId;

    if (!groupId) {
      return res.json(null);
    }

    const [groups] = await pool.query(
      'SELECT * FROM `groups` WHERE id = ?',
      [groupId]
    );

    if (groups.length === 0) {
      return res.json(null);
    }

    const group = groups[0];

    // Get members
    const [members] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.role, u.is_online, u.is_panic,
              ul.latitude, ul.longitude, ul.recorded_at as location_timestamp
       FROM users u
       LEFT JOIN (
         SELECT user_id, latitude, longitude, recorded_at
         FROM user_locations
         WHERE (user_id, recorded_at) IN (
           SELECT user_id, MAX(recorded_at)
           FROM user_locations
           GROUP BY user_id
         )
       ) ul ON u.id = ul.user_id
       WHERE u.group_id = ?`,
      [groupId]
    );

    const formattedMembers = members.map(user => ({
      id: user.id.toString(),
      name: user.name,
      phone: user.phone,
      role: user.role,
      groupId: groupId.toString(),
      isOnline: Boolean(user.is_online),
      isPanic: Boolean(user.is_panic),
      location: user.latitude ? {
        lat: parseFloat(user.latitude),
        lng: parseFloat(user.longitude),
        timestamp: new Date(user.location_timestamp).getTime()
      } : null
    }));

    res.json({
      id: group.id.toString(),
      name: group.name,
      destination: group.destination,
      departureDate: group.departure_date,
      returnDate: group.return_date,
      departureAirport: group.departure_airport,
      isActive: Boolean(group.is_active),
      members: formattedMembers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group info by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [groups] = await pool.query(
      'SELECT * FROM `groups` WHERE id = ?',
      [req.params.id]
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Group tidak ditemukan' });
    }

    const group = groups[0];

    // Get member count
    const [members] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE group_id = ?',
      [group.id]
    );

    res.json({
      id: group.id.toString(),
      name: group.name,
      destination: group.destination,
      departureDate: group.departure_date,
      returnDate: group.return_date,
      departureAirport: group.departure_airport,
      isActive: Boolean(group.is_active),
      memberCount: members[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join group by join code
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const userId = req.user.id;

    if (!joinCode) {
      return res.status(400).json({ message: 'Kode gabung harus diisi' });
    }

    // Find group by join code
    const [groups] = await pool.query(
      'SELECT * FROM `groups` WHERE join_code = ? AND is_active = 1',
      [joinCode.toUpperCase()]
    );

    if (groups.length === 0) {
      return res.status(404).json({ message: 'Kode gabung tidak valid atau grup tidak aktif' });
    }

    const group = groups[0];

    // Check if user already in a group
    const [currentUser] = await pool.query('SELECT group_id FROM users WHERE id = ?', [userId]);
    if (currentUser[0].group_id) {
      return res.status(400).json({ message: 'Anda sudah tergabung dalam grup lain. Keluar dari grup terlebih dahulu.' });
    }

    // Update user's group
    await pool.query('UPDATE users SET group_id = ? WHERE id = ?', [group.id, userId]);

    // Generate new token with updated groupId
    const newToken = jwt.sign(
      { id: req.user.id, phone: req.user.phone, role: req.user.role, groupId: group.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Get member count
    const [members] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE group_id = ?',
      [group.id]
    );

    res.json({
      message: 'Berhasil bergabung ke grup',
      token: newToken,
      group: {
        id: group.id.toString(),
        name: group.name,
        departureDate: group.departure_date,
        returnDate: group.return_date,
        departureAirport: group.departure_airport,
        destination: group.destination,
        isActive: Boolean(group.is_active),
        memberCount: members[0].count
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave current group
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is in a group
    const [currentUser] = await pool.query('SELECT group_id, role, phone FROM users WHERE id = ?', [userId]);

    if (!currentUser[0].group_id) {
      return res.status(400).json({ message: 'Anda tidak tergabung dalam grup manapun' });
    }

    // Prevent admin from leaving (they should transfer ownership first)
    if (currentUser[0].role && currentUser[0].role.toLowerCase() === 'admin') {
      return res.status(400).json({ message: 'Admin tidak dapat meninggalkan grup. Transfer kepemilikan terlebih dahulu.' });
    }

    // Remove user from group
    await pool.query('UPDATE users SET group_id = NULL WHERE id = ?', [userId]);

    // Generate new token with null groupId
    const newToken = jwt.sign(
      { id: req.user.id, phone: currentUser[0].phone, role: currentUser[0].role, groupId: null },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Berhasil keluar dari grup', token: newToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
