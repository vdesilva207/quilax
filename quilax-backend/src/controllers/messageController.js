import * as service from "../services/messageService.js";

/*
====================================
GET INBOX
====================================
*/
export async function getInbox(req, res) {
  try {
    const inbox = await service.getInbox(req.user.id);
    res.json(inbox);
  } catch (err) {
    console.error("❌ getInbox error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
GET CONVERSATION
====================================
*/
export async function getConversation(req, res) {
  try {
    const otherUserId = Number(req.params.userId);
    if (!otherUserId) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const messages = await service.getConversation(req.user.id, otherUserId);
    res.json(messages);
  } catch (err) {
    console.error("❌ getConversation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
SEND MESSAGE
====================================
*/
export async function sendMessage(req, res) {
  try {
    const { toUserId, content } = req.body;

    if (!toUserId || !content || content.trim().length === 0) {
      return res.status(400).json({ error: "Invalid message data" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: "Message too long" });
    }

    const message = await service.sendUserMessage(
      req.user.id,
      Number(toUserId),
      content.trim()
    );

    res.json(message);
  } catch (err) {
    console.error("❌ sendMessage error:", err);
    res.status(400).json({ error: err.message });
  }
}

/*
====================================
MARK READ
====================================
*/
export async function markRead(req, res) {
  try {
    const otherUserId = Number(req.params.userId);
    if (!otherUserId) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    await service.markMessagesAsRead(req.user.id, otherUserId);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ markRead error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
BLOCK USER
====================================
*/
export async function blockUser(req, res) {
  try {
    const blockedId = Number(req.params.userId);
    if (!blockedId) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    await service.blockUser(req.user.id, blockedId);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ blockUser error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}