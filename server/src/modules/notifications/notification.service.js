const { query } = require('../../config/database');
const emailService = require('./email.service');

class NotificationService {
  /**
   * Retrieves user's email, creates in-app notification, and attempts email delivery.
   */
  async notifyUser({ userId, type, title, body, entityType = null, entityId = null, emailTemplate = null, emailData = {} }) {
    try {
      // 1. Get user email and preferences
      const userRes = await query(`SELECT email FROM users WHERE id = $1`, [userId]);
      if (userRes.rows.length === 0) return; // User not found
      const userEmail = userRes.rows[0].email;

      // 2. Check if user opted out of this specific notification type
      const prefRes = await query(
        `SELECT is_enabled FROM notification_preferences WHERE user_id = $1 AND notification_type = $2`,
        [userId, type]
      );
      if (prefRes.rows.length > 0 && prefRes.rows[0].is_enabled === false) {
        // User explicitly disabled this notification type
        return;
      }

      // 3. Insert in-app notification
      await query(
        `INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, type, title, body, entityType, entityId]
      );

      // 4. Send email asynchronously if template provided
      if (emailTemplate && userEmail) {
        // We do not await this to ensure it doesn't block or rollback the caller
        emailService.sendTemplateEmail(userEmail, emailTemplate, emailData).catch(err => {
          console.error('Unhandled error in async email sending:', err);
        });
      }
    } catch (err) {
      console.error('Failed to process notification:', err);
      // We do not throw to avoid rolling back business transactions
    }
  }

  // --- API Methods ---

  async getMyNotifications(userId, limit = 50, offset = 0) {
    const { rows } = await query(
      `SELECT id, type, title, body, entity_type, entity_id, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countRes = await query(`SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`, [userId]);
    const total = parseInt(countRes.rows[0].total, 10);

    return { notifications: rows, total, limit, offset };
  }

  async getUnreadCount(userId) {
    const { rows } = await query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(rows[0].unread_count, 10);
  }

  async markAsRead(userId, notificationId) {
    const { rowCount } = await query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_read = FALSE`,
      [notificationId, userId]
    );
    return rowCount > 0;
  }

  async markAllAsRead(userId) {
    const { rowCount } = await query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return rowCount;
  }
}

module.exports = new NotificationService();
