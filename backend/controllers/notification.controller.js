const mongoose = require('mongoose');
const Notification = require('../models/Notification.model');

exports.getNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { user: req.user.id };

    if (req.query.unreadOnly === 'true') {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('relatedItem', 'title type category imageUrl')
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user.id, isRead: false })
    ]);

    return res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    return res.json({ notification, unreadCount });
  } catch (error) {
    return next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.json({ message: 'All notifications marked as read.', unreadCount: 0 });
  } catch (error) {
    return next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const result = await Notification.deleteOne({ _id: req.params.id, user: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    return res.json({ message: 'Notification removed.', unreadCount });
  } catch (error) {
    return next(error);
  }
};
