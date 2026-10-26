const mongoose = require('mongoose');
const Chat = require('../models/Chat.model');
const Message = require('../models/Message.model');
const Match = require('../models/Match.model');
const Item = require('../models/Item.model');
const User = require('../models/User.model');
const { notifyChatMessage, notifyItemStatus, createNotification } = require('../services/notification.service');

function safeParticipant(user) {
  if (!user) return null;
  return {
    id: user._id || user.id,
    name: user.name,
    email: user.email,
    isBlocked: user.isBlocked
  };
}

exports.initiateChat = async (req, res, next) => {
  try {
    const { matchId } = req.body || {};
    if (!mongoose.isValidObjectId(matchId)) {
      return res.status(422).json({ message: 'Valid matchId is required.' });
    }

    const match = await Match.findById(matchId)
      .populate('lostItem')
      .populate('foundItem');

    if (!match) {
      return res.status(404).json({ message: 'Match not found.' });
    }

    const lostItem = match.lostItem;
    const foundItem = match.foundItem;

    if (!lostItem || !foundItem) {
      return res.status(422).json({ message: 'Associated reports are no longer available.' });
    }

    if (lostItem.status !== 'active' || foundItem.status !== 'active') {
      return res.status(422).json({ message: 'Cannot start chat on resolved or archived items.' });
    }

    if (lostItem.moderationState === 'held' || foundItem.moderationState === 'held') {
      return res.status(422).json({ message: 'Cannot start chat on items currently held by moderation.' });
    }

    const lostUserId = String(lostItem.user);
    const foundUserId = String(foundItem.user);
    const currentUserId = String(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && currentUserId !== lostUserId && currentUserId !== foundUserId) {
      return res.status(403).json({ message: 'You are not authorized to initiate chat for this match.' });
    }

    // Check if chat already exists for this match
    let chat = await Chat.findOne({ match: match._id })
      .populate('lostItem', 'title category location imageUrl status')
      .populate('foundItem', 'title category location imageUrl status')
      .populate('participants', 'name email isBlocked');

    if (chat) {
      return res.json(chat);
    }

    // Verify participants are not blocked
    const [lostUser, foundUser] = await Promise.all([
      User.findById(lostUserId).select('name email isBlocked'),
      User.findById(foundUserId).select('name email isBlocked')
    ]);

    if (!lostUser || !foundUser) {
      return res.status(404).json({ message: 'One or more participants are no longer available.' });
    }

    if (lostUser.isBlocked || foundUser.isBlocked) {
      return res.status(403).json({ message: 'Cannot initiate chat with a blocked account.' });
    }

    chat = await Chat.create({
      match: match._id,
      lostItem: lostItem._id,
      foundItem: foundItem._id,
      participants: [lostItem.user, foundItem.user],
      status: 'active'
    });

    await chat.populate([
      { path: 'lostItem', select: 'title category location imageUrl status' },
      { path: 'foundItem', select: 'title category location imageUrl status' },
      { path: 'participants', select: 'name email isBlocked' }
    ]);

    // Notify the other user
    const recipientId = currentUserId === lostUserId ? foundUserId : lostUserId;
    await createNotification({
      user: recipientId,
      type: 'chat_message',
      title: 'Secure Chat Connected',
      message: `${req.user.name || 'A user'} opened a secure chat to verify item ownership.`,
      link: `/chats/${chat._id}`
    });

    return res.status(201).json(chat);
  } catch (error) {
    return next(error);
  }
};

exports.getMyChats = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' && req.query.all === 'true'
      ? {}
      : { participants: req.user.id };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const chats = await Chat.find(filter)
      .sort({ updatedAt: -1 })
      .populate('lostItem', 'title category location imageUrl status')
      .populate('foundItem', 'title category location imageUrl status')
      .populate('participants', 'name email isBlocked')
      .populate('lastMessage.sender', 'name')
      .lean();

    return res.json(chats);
  } catch (error) {
    return next(error);
  }
};

exports.getChatById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const chat = await Chat.findById(req.params.id)
      .populate('lostItem', 'title category location dateLost imageUrl status user')
      .populate('foundItem', 'title category location dateFound imageUrl status user')
      .populate('participants', 'name email isBlocked')
      .populate('resolvedBy', 'name');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const isParticipant = chat.participants.some((p) => String(p._id || p) === req.user.id);
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this chat.' });
    }

    return res.json(chat);
  } catch (error) {
    return next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const isParticipant = chat.participants.some((p) => String(p) === req.user.id);
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view messages in this chat.' });
    }

    const messages = await Message.find({ chat: chat._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name')
      .lean();

    // Mark unread messages as read
    await Message.updateMany(
      { chat: chat._id, sender: { $ne: req.user.id }, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    return res.json(messages);
  } catch (error) {
    return next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const isParticipant = chat.participants.some((p) => String(p) === req.user.id);
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat.' });
    }

    if (chat.status !== 'active') {
      return res.status(422).json({ message: `Cannot send messages to a ${chat.status} chat.` });
    }

    const rawContent = req.body?.content;
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      return res.status(422).json({ message: 'Message content is required.' });
    }

    const content = rawContent.trim();
    if (content.length > 2000) {
      return res.status(422).json({ message: 'Message cannot exceed 2000 characters.' });
    }

    const message = await Message.create({
      chat: chat._id,
      sender: req.user.id,
      content,
      readBy: [req.user.id]
    });

    await message.populate('sender', 'name');

    // Update chat lastMessage
    chat.lastMessage = {
      content,
      sender: req.user.id,
      createdAt: message.createdAt
    };
    await chat.save();

    // Dispatch notification to other participant
    const recipientId = chat.participants.find((p) => String(p) !== req.user.id);
    if (recipientId) {
      await notifyChatMessage({
        recipientId,
        senderName: req.user.name,
        chatId: chat._id,
        contentPreview: content
      });
    }

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
};

exports.resolveChat = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const isParticipant = chat.participants.some((p) => String(p) === req.user.id);
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to resolve this chat.' });
    }

    if (chat.status !== 'active') {
      return res.status(422).json({ message: `This chat is already ${chat.status}.` });
    }

    chat.status = 'closed';
    chat.closedReason = 'Item recovered and return confirmed. Resolved successfully.';
    chat.resolvedBy = req.user.id;
    chat.resolvedAt = new Date();
    await chat.save();

    // Mark both items as resolved
    await Promise.all([
      Item.findByIdAndUpdate(chat.lostItem, { status: 'resolved' }),
      Item.findByIdAndUpdate(chat.foundItem, { status: 'resolved' })
    ]);

    // Mark match as confirmed
    await Match.findByIdAndUpdate(chat.match, { status: 'confirmed' });

    // Dismiss other candidate matches involving these resolved items
    await Match.updateMany(
      {
        status: 'candidate',
        _id: { $ne: chat.match },
        $or: [
          { lostItem: chat.lostItem },
          { foundItem: chat.foundItem }
        ]
      },
      { $set: { status: 'dismissed' } }
    );

    // Notify both participants
    const [lostItem, foundItem] = await Promise.all([
      Item.findById(chat.lostItem).select('title'),
      Item.findById(chat.foundItem).select('title')
    ]);

    for (const participantId of chat.participants) {
      await createNotification({
        user: participantId,
        type: 'item_status',
        title: 'Item Successfully Recovered & Resolved',
        message: `The report for "${lostItem?.title || 'item'}" / "${foundItem?.title || 'item'}" was successfully confirmed, marked as resolved, and the chat was closed.`,
        link: `/chats/${chat._id}`
      });
    }

    await chat.populate([
      { path: 'lostItem', select: 'title category location dateLost imageUrl status user' },
      { path: 'foundItem', select: 'title category location dateFound imageUrl status user' },
      { path: 'participants', select: 'name email isBlocked' },
      { path: 'resolvedBy', select: 'name' }
    ]);

    return res.json({ chat, message: 'Item recovered and resolved successfully. Conversation closed.' });
  } catch (error) {
    return next(error);
  }
};

exports.closeChat = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found.' });
    }

    const isParticipant = chat.participants.some((p) => String(p) === req.user.id);
    if (!isParticipant && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to close this chat.' });
    }

    if (chat.status !== 'active') {
      return res.status(422).json({ message: `This chat is already ${chat.status}.` });
    }

    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : 'Closed by participant';
    chat.status = 'closed';
    chat.closedReason = reason;
    await chat.save();

    // Notify other participant
    const recipientId = chat.participants.find((p) => String(p) !== req.user.id);
    if (recipientId) {
      await createNotification({
        user: recipientId,
        type: 'system',
        title: 'Chat Closed',
        message: `The secure chat was closed: ${reason}`,
        link: `/chats/${chat._id}`
      });
    }

    return res.json({ chat, message: 'Chat closed.' });
  } catch (error) {
    return next(error);
  }
};
