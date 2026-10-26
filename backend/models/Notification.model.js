const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['match_found', 'chat_message', 'item_status', 'system'],
    required: true
  },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  link: { type: String, trim: true, maxlength: 200 },
  relatedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  relatedMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
