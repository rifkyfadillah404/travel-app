const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all notifications for user's group
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groupId = req.user.groupId;
    
    if (!groupId) {
      return res.json([]);
    }

    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE group_id = ? ORDER BY created_at DESC',
      [groupId]
    );

    res.json(notifications.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      type: n.type,
      timestamp: n.created_at
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
