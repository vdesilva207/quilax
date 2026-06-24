import * as service from "../services/notificationService.js";

/*
====================================
GET NOTIFICATIONS
====================================
*/
export async function getNotifications(req, res) {
  try {
    const notifications = await service.getUserNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    console.error("❌ getNotifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
MARK NOTIFICATION READ
====================================
*/
export async function markRead(req, res) {
  try {
    const notificationId = Number(req.params.id);

    if (!notificationId) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    await service.markNotificationAsRead(req.user.id, notificationId);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ markNotification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}