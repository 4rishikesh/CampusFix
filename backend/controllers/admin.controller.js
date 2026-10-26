const mongoose = require('mongoose');
const User = require('../models/User.model');
const Item = require('../models/Item.model');
const Match = require('../models/Match.model');
const Chat = require('../models/Chat.model');
const { runMatchingForItem } = require('../services/matching.service');

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validObjectId(value) {
  return mongoose.isValidObjectId(value);
}

function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    blockedAt: user.blockedAt || null,
    blockReason: user.blockReason || null,
    blockedBy: user.blockedBy ? {
      id: user.blockedBy._id || user.blockedBy,
      name: user.blockedBy.name,
      email: user.blockedBy.email
    } : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function dismissCandidateMatches(itemIds) {
  if (!itemIds.length) return;
  await Match.updateMany(
    { status: 'candidate', $or: [{ lostItem: { $in: itemIds } }, { foundItem: { $in: itemIds } }] },
    { $set: { status: 'dismissed' } }
  );
  await Chat.updateMany(
    { status: 'active', $or: [{ lostItem: { $in: itemIds } }, { foundItem: { $in: itemIds } }] },
    { $set: { status: 'closed', closedReason: 'Associated report was held by moderation.' } }
  );
}

async function holdReportsForBlockedUser(userId) {
  await Chat.updateMany(
    { participants: userId, status: 'active' },
    { $set: { status: 'closed', closedReason: 'Participant account was blocked by an administrator.' } }
  );
  const reports = await Item.find({ user: userId, status: 'active', moderationState: { $ne: 'held' } }).select('_id');
  if (!reports.length) return 0;
  const itemIds = reports.map((report) => report._id);
  await Item.updateMany({ _id: { $in: itemIds } }, { $set: { moderationState: 'held' } });
  await dismissCandidateMatches(itemIds);
  return itemIds.length;
}

exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    if (req.query.search) {
      const expression = new RegExp(escapeRegex(String(req.query.search).trim().slice(0, 100)), 'i');
      filter.$or = [{ name: expression }, { email: expression }];
    }
    if (req.query.blocked !== undefined) {
      if (!['true', 'false'].includes(String(req.query.blocked))) return res.status(422).json({ message: 'blocked must be true or false.' });
      filter.isBlocked = req.query.blocked === 'true';
    }
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('blockedBy', 'name email'),
      User.countDocuments(filter)
    ]);
    return res.json({ users: users.map(safeUser), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'User not found.' });
    if (req.params.id === req.user.id) return res.status(422).json({ message: 'Administrators cannot block themselves.' });
    const reason = req.body?.reason;
    if (reason !== undefined && (typeof reason !== 'string' || reason.trim().length > 500)) {
      return res.status(422).json({ message: 'Block reason must be 500 characters or fewer.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') return res.status(422).json({ message: 'Administrators cannot block another administrator.' });
    if (user.isBlocked) return res.status(409).json({ message: 'This user is already blocked.' });

    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedBy = req.user.id;
    user.blockReason = typeof reason === 'string' && reason.trim() ? reason.trim() : undefined;
    await user.save();
    const heldReports = await holdReportsForBlockedUser(user._id);
    await user.populate('blockedBy', 'name email');
    return res.json({ user: safeUser(user), heldReports });
  } catch (error) {
    return next(error);
  }
};

exports.unblockUser = async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'User not found.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (!user.isBlocked) return res.status(409).json({ message: 'This user is not blocked.' });

    user.isBlocked = false;
    user.blockedAt = undefined;
    user.blockedBy = undefined;
    user.blockReason = undefined;
    await user.save();
    return res.json({ user: safeUser(user), message: 'User unblocked. Held reports still require administrator review before release.' });
  } catch (error) {
    return next(error);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req.query);
    const filter = {};
    for (const field of ['type', 'status', 'visibility']) {
      if (req.query[field] !== undefined) filter[field] = req.query[field];
    }
    if (req.query.moderation !== undefined) {
      if (!['clear', 'held'].includes(req.query.moderation)) return res.status(422).json({ message: 'moderation must be clear or held.' });
      filter.moderationState = req.query.moderation;
    }
    if (req.query.search) {
      const expression = new RegExp(escapeRegex(String(req.query.search).trim().slice(0, 100)), 'i');
      filter.$or = [{ title: expression }, { category: expression }, { location: expression }, { description: expression }];
    }
    const [items, total] = await Promise.all([
      Item.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email isBlocked'),
      Item.countDocuments(filter)
    ]);
    return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return next(error);
  }
};

exports.moderateItem = async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'Item not found.' });
    const { action } = req.body || {};
    if (!['hold', 'release', 'archive'].includes(action)) return res.status(422).json({ message: 'action must be hold, release, or archive.' });
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });

    if (action === 'hold') {
      item.moderationState = 'held';
      await item.save();
      await dismissCandidateMatches([item._id]);
    } else if (action === 'release') {
      if (item.status !== 'active') return res.status(422).json({ message: 'Only active reports can be released.' });
      item.moderationState = 'clear';
      await item.save();
      await runMatchingForItem(item._id);
    } else {
      item.status = 'archived';
      await item.save();
      await dismissCandidateMatches([item._id]);
    }
    return res.json(item);
  } catch (error) {
    return next(error);
  }
};

module.exports.safeUser = safeUser;
