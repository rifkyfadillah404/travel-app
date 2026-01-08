const express = require('express');
const pool = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendPanicNotification } = require('./push');

const router = express.Router();

// Get all panic alerts for group
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groupId = req.user.groupId;

    const [alerts] = await pool.query(
      `SELECT pa.*, u.name as user_name, u.phone as user_phone,
              r.name as resolved_by_name
       FROM panic_alerts pa
       JOIN users u ON pa.user_id = u.id
       LEFT JOIN users r ON pa.resolved_by = r.id
       WHERE u.group_id = ?
       ORDER BY pa.created_at DESC`,
      [groupId]
    );

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id.toString(),
      userId: alert.user_id.toString(),
      userName: alert.user_name,
      userPhone: alert.user_phone,
      message: alert.message || 'DARURAT! Butuh bantuan segera!',
      location: {
        lat: parseFloat(alert.latitude) || 0,
        lng: parseFloat(alert.longitude) || 0
      },
      isResolved: Boolean(alert.is_resolved),
      resolvedBy: alert.resolved_by_name,
      resolvedAt: alert.resolved_at,
      timestamp: new Date(alert.created_at).getTime()
    }));

    res.json(formattedAlerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create panic alert
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, latitude, longitude } = req.body;
    const userId = req.user.id;
    const groupId = req.user.groupId;

    // Insert panic alert
    const [result] = await pool.query(
      'INSERT INTO panic_alerts (user_id, message, latitude, longitude) VALUES (?, ?, ?, ?)',
      [userId, message || 'DARURAT! Butuh bantuan segera!', latitude, longitude]
    );

    // Update user panic status
    await pool.query('UPDATE users SET is_panic = TRUE WHERE id = ?', [userId]);

    // Get user info for response
    const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);

    const alert = {
      id: result.insertId.toString(),
      userId: userId.toString(),
      userName: users[0].name,
      message: message || 'DARURAT! Butuh bantuan segera!',
      location: { lat: latitude, lng: longitude },
      isResolved: false,
      timestamp: Date.now()
    };

    // Send push notification to group members (async, don't wait)
    sendPanicNotification(groupId, userId, users[0].name, message).catch(err => {
      console.error('Failed to send panic push notifications:', err);
    });

    res.status(201).json(alert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resolve panic alert
router.put('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const alertId = req.params.id;
    const resolvedBy = req.user.id;
    const userRole = req.user.role;

    // Get alert info
    const [alerts] = await pool.query('SELECT user_id FROM panic_alerts WHERE id = ?', [alertId]);
    if (alerts.length === 0) {
      return res.status(404).json({ message: 'Alert tidak ditemukan' });
    }

    const alertOwnerId = alerts[0].user_id;

    // Check permission: Admin or Owner
    // Note: Role comparison might need to be case-insensitive depending on DB
    if (userRole?.toLowerCase() !== 'admin' && resolvedBy !== alertOwnerId) {
      return res.status(403).json({ message: 'Anda tidak berhak menyelesaikan alert ini' });
    }

    // Update alert
    await pool.query(
      'UPDATE panic_alerts SET is_resolved = TRUE, resolved_by = ?, resolved_at = NOW() WHERE id = ?',
      [resolvedBy, alertId]
    );

    // Update user panic status
    await pool.query('UPDATE users SET is_panic = FALSE WHERE id = ?', [alertOwnerId]);

    res.json({ message: 'Alert berhasil diselesaikan' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
