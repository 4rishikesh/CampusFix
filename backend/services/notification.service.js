const Notification = require('../models/Notification.model');

async function createNotification({ user, type, title, message, link, relatedItem, relatedMatch }) {
  if (!user || !type || !title || !message) return null;
  try {
    return await Notification.create({
      user,
      type,
      title,
      message,
      link,
      relatedItem,
      relatedMatch
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

async function notifyMatch(match, lostItem, foundItem) {
  if (!match || !lostItem || !foundItem) return;
  const similarityPct = Math.round((match.scores?.combined || 0) * 100);

  // Notify lost item owner
  if (lostItem.user) {
    const existing = await Notification.findOne({
      user: lostItem.user,
      relatedMatch: match._id,
      type: 'match_found'
    });
    if (!existing) {
      await createNotification({
        user: lostItem.user,
        type: 'match_found',
        title: 'Potential Match Found',
        message: `A found item "${foundItem.title}" may match your lost "${lostItem.title}" (${similarityPct}% similarity).`,
        link: '/dashboard',
        relatedItem: lostItem._id,
        relatedMatch: match._id
      });
    }
  }

  // Notify found item owner
  if (foundItem.user && String(foundItem.user) !== String(lostItem.user)) {
    const existing = await Notification.findOne({
      user: foundItem.user,
      relatedMatch: match._id,
      type: 'match_found'
    });
    if (!existing) {
      await createNotification({
        user: foundItem.user,
        type: 'match_found',
        title: 'Potential Match Found',
        message: `A lost report "${lostItem.title}" may match your found item "${foundItem.title}" (${similarityPct}% similarity).`,
        link: '/dashboard',
        relatedItem: foundItem._id,
        relatedMatch: match._id
      });
    }
  }
}

async function notifyChatMessage({ recipientId, senderName, chatId, contentPreview }) {
  if (!recipientId || !chatId) return;
  const preview = contentPreview ? (contentPreview.length > 60 ? `${contentPreview.slice(0, 57)}...` : contentPreview) : 'New message';
  await createNotification({
    user: recipientId,
    type: 'chat_message',
    title: `Message from ${senderName || 'Matched User'}`,
    message: preview,
    link: `/chats/${chatId}`
  });
}

async function notifyItemStatus({ userId, itemTitle, newStatus, reason }) {
  if (!userId || !itemTitle) return;
  const reasonText = reason ? ` (${reason})` : '';
  await createNotification({
    user: userId,
    type: 'item_status',
    title: `Item ${newStatus}`,
    message: `Your item "${itemTitle}" was marked as ${newStatus}${reasonText}.`,
    link: '/dashboard'
  });
}

module.exports = {
  createNotification,
  notifyMatch,
  notifyChatMessage,
  notifyItemStatus
};
