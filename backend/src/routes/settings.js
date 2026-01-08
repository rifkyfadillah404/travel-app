const express = require('express');
const pool = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get settings for group
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groupId = req.user.groupId;

    const [settings] = await pool.query(
      'SELECT * FROM app_settings WHERE group_id = ?',
      [groupId]
    );

    if (settings.length === 0) {
      // Return default settings
      return res.json({
        isGpsActive: true,
        trackingInterval: 30,
        radiusLimit: 500,
        isAppActive: true
      });
    }

    const setting = settings[0];
    res.json({
      isGpsActive: Boolean(setting.is_gps_active),
      trackingInterval: setting.tracking_interval,
      radiusLimit: setting.radius_limit,
      isAppActive: Boolean(setting.is_app_active)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update settings
router.put('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const groupId = req.user.groupId;
    const { isGpsActive, trackingInterval, radiusLimit, isAppActive } = req.body;

    // Check if settings exist
    const [existing] = await pool.query(
      'SELECT id FROM app_settings WHERE group_id = ?',
      [groupId]
    );

    if (existing.length === 0) {
      // Insert new settings
      await pool.query(
        'INSERT INTO app_settings (group_id, is_gps_active, tracking_interval, radius_limit, is_app_active) VALUES (?, ?, ?, ?, ?)',
        [groupId, isGpsActive, trackingInterval, radiusLimit, isAppActive]
      );
    } else {
      // Update existing settings
      await pool.query(
        'UPDATE app_settings SET is_gps_active = ?, tracking_interval = ?, radius_limit = ?, is_app_active = ? WHERE group_id = ?',
        [isGpsActive, trackingInterval, radiusLimit, isAppActive, groupId]
      );
    }

    res.json({
      message: 'Settings berhasil diupdate',
      settings: { isGpsActive, trackingInterval, radiusLimit, isAppActive }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
