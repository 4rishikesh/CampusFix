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

  const saveMatchNotification = (notification) => Notification.findOneAndUpdate(
    { user: notification.user, relatedMatch: notification.relatedMatch, type: 'match_found' },
    { $setOnInsert: notification },
    { upsert: true, new: true }
  );

  // Notify each owner once for a match. $setOnInsert prevents normal matching
  // reruns from adding a second alert for the same pair.
  if (lostItem.user) {
    await saveMatchNotification({
      user: lostItem.user,
      type: 'match_found',
      title: 'Potential Match Found',
      message: `A found item "${foundItem.title}" may match your lost "${lostItem.title}" (${similarityPct}% similarity).`,
      link: '/dashboard',
      relatedItem: lostItem._id,
      relatedMatch: match._id
    });
  }

  // Notify found item owner
  if (foundItem.user && String(foundItem.user) !== String(lostItem.user)) {
    await saveMatchNotification({
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

async function removeMatchNotifications(matchId) {
  if (!matchId) return;
  await Notification.deleteMany({ relatedMatch: matchId, type: 'match_found' });
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
  removeMatchNotifications,
  notifyMatch,
  notifyChatMessage,
  notifyItemStatus
};
