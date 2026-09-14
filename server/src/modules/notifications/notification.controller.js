const notificationService = require('./notification.service');

class NotificationController {
  async getMyNotifications(req, res) {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const result = await notificationService.getMyNotifications(req.user.id, limit, offset);
    res.json({ success: true, ...result });
  }

  async getUnreadCount(req, res) {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, unread_count: count });
  }

  async markAsRead(req, res) {
    const updated = await notificationService.markAsRead(req.user.id, req.params.id);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found or already read' });
    }
    res.json({ success: true, message: 'Notification marked as read' });
  }

  async markAllAsRead(req, res) {
    const updatedCount = await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: `${updatedCount} notifications marked as read` });
  }
}

module.exports = new NotificationController();
