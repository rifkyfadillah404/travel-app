const express = require('express');
const pool = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all itinerary items for the user's group
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groupId = req.user.groupId;
    
    if (!groupId) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      'SELECT * FROM itinerary WHERE group_id = ? ORDER BY day ASC, time ASC',
      [groupId]
    );
    
    res.json(rows.map(item => ({
      id: item.id,
      day: item.day,
      date: item.date,
      time: item.time,
      activity: item.activity,
      location: item.location,
      description: item.description,
      icon: item.icon
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get itinerary by specific group ID (for admin panel)
router.get('/group/:groupId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { groupId } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM itinerary WHERE group_id = ? ORDER BY day ASC, time ASC',
      [groupId]
    );

    // Always return 200 with array (empty if no data) to avoid console errors
    res.json(rows.map(item => ({
      id: item.id,
      day: item.day,
      date: item.date,
      time: item.time,
      activity: item.activity,
      location: item.location,
      description: item.description,
      icon: item.icon
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get itinerary by day for the user's group
router.get('/day/:day', authMiddleware, async (req, res) => {
  try {
    const { day } = req.params;
    const groupId = req.user.groupId;

    if (!groupId) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      'SELECT * FROM itinerary WHERE group_id = ? AND day = ? ORDER BY time ASC', 
      [groupId, day]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create itinerary item (Admin/Pembimbing only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { day, date, time, activity, location, description, icon } = req.body;
    const groupId = req.user.groupId;

    if (!groupId) {
      return res.status(400).json({ message: 'Anda tidak terdaftar dalam grup mana pun' });
    }
    
    if (!day || !date || !time || !activity || !location) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    const [result] = await pool.query(
      'INSERT INTO itinerary (group_id, day, date, time, activity, location, description, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [groupId, day, date, time, activity, location, description, icon || 'calendar']
    );

    res.status(201).json({
      message: 'Jadwal berhasil ditambahkan',
      id: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete itinerary item (Admin/Pembimbing only)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = req.user.groupId;

    // Verify ownership
    const [existing] = await pool.query('SELECT id FROM itinerary WHERE id = ? AND group_id = ?', [id, groupId]);
    if (existing.length === 0) {
      return res.status(403).json({ message: 'Akses ditolak atau jadwal tidak ditemukan' });
    }

    await pool.query('DELETE FROM itinerary WHERE id = ?', [id]);
    res.json({ message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
