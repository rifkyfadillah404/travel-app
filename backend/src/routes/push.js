const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const pool = require('../config/database');
const { authMiddleware: authenticateToken, adminOnly: authenticateAdmin } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Load VAPID keys
let vapidKeys;
try {
    // Try to load from JSON file first
    const keysPath = path.join(__dirname, '../../vapid-keys.json');
    if (fs.existsSync(keysPath)) {
        vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    } else {
        // Fallback to environment variables
        vapidKeys = {
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
        };
    }

    if (vapidKeys.publicKey && vapidKeys.privateKey) {
        webpush.setVapidDetails(
            'mailto:admin@travel-app.com',
            vapidKeys.publicKey,
            vapidKeys.privateKey
        );
        console.log('✅ Web Push configured successfully');
    } else {
        console.log('⚠️ VAPID keys not found - push notifications disabled');
    }
} catch (err) {
    console.error('❌ Failed to load VAPID keys:', err);
}

// Get public VAPID key
router.get('/vapid-public-key', (req, res) => {
    if (!vapidKeys?.publicKey) {
        return res.status(500).json({ message: 'Push notifications not configured' });
    }
    res.json({ publicKey: vapidKeys.publicKey });
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.id;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription' });
        }

        // Store subscription in database
        // Check if user already has a subscription
        const [existing] = await pool.query(
            'SELECT id FROM push_subscriptions WHERE user_id = ?',
            [userId]
        );

        if (existing.length > 0) {
            // Update existing subscription
            await pool.query(
                'UPDATE push_subscriptions SET subscription = ?, updated_at = NOW() WHERE user_id = ?',
                [JSON.stringify(subscription), userId]
            );
        } else {
            // Insert new subscription
            await pool.query(
                'INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)',
                [userId, JSON.stringify(subscription)]
            );
        }

        res.json({ message: 'Subscription saved successfully' });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ message: 'Failed to save subscription' });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);

        res.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ message: 'Failed to unsubscribe' });
    }
});

// Send push notification to group (admin only)
router.post('/send-to-group', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { title, body, groupId } = req.body;

        if (!title || !body || !groupId) {
            return res.status(400).json({ message: 'Title, body, and groupId are required' });
        }

        // Get all subscriptions for users in the group
        const [subscriptions] = await pool.query(`
      SELECT ps.subscription 
      FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.group_id = ?
    `, [groupId]);

        if (subscriptions.length === 0) {
            return res.json({ message: 'No subscribers in group', sent: 0 });
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: { url: '/' }
        });

        let sent = 0;
        let failed = 0;

        for (const row of subscriptions) {
            try {
                const subscription = JSON.parse(row.subscription);
                await webpush.sendNotification(subscription, payload);
                sent++;
            } catch (err) {
                console.error('Failed to send push:', err.message);
                failed++;
            }
        }

        res.json({ message: 'Notifications sent', sent, failed });
    } catch (error) {
        console.error('Send push error:', error);
        res.status(500).json({ message: 'Failed to send notifications' });
    }
});

// Helper function to send panic alert notifications
async function sendPanicNotification(groupId, panicUserId, panicUserName, message) {
    if (!vapidKeys?.publicKey) {
        console.log('Push notifications not configured, skipping panic notification');
        return;
    }

    try {
        // Get all subscriptions for users in the group (except the panic user)
        const [subscriptions] = await pool.query(`
      SELECT ps.subscription, u.name
      FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.group_id = ? AND u.id != ?
    `, [groupId, panicUserId]);

        if (subscriptions.length === 0) {
            console.log('No subscribers to notify for panic alert');
            return;
        }

        const payload = JSON.stringify({
            title: '🚨 PANIC ALERT!',
            body: `${panicUserName}: ${message || 'Membutuhkan bantuan segera!'}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: 'panic-alert',
            requireInteraction: true, // Keeps notification until user interacts
            data: { url: '/tracking', type: 'panic' }
        });

        let sent = 0;
        for (const row of subscriptions) {
            try {
                const subscription = JSON.parse(row.subscription);
                await webpush.sendNotification(subscription, payload);
                sent++;
            } catch (err) {
                console.error('Failed to send panic push to', row.name, ':', err.message);
            }
        }

        console.log(`Panic notification sent to ${sent} users`);
    } catch (error) {
        console.error('Send panic notification error:', error);
    }
}

module.exports = router;
module.exports.sendPanicNotification = sendPanicNotification;
