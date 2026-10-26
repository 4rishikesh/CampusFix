const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
  lostItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  foundItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  status: { type: String, enum: ['active', 'closed', 'resolved'], default: 'active', index: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  closedReason: { type: String, trim: true, maxlength: 500 },
  lastMessage: {
    content: { type: String, trim: true, maxlength: 2000 },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date }
  }
}, { timestamps: true });

chatSchema.index({ participants: 1, status: 1, updatedAt: -1 });
chatSchema.index({ lostItem: 1, foundItem: 1 });

module.exports = mongoose.model('Chat', chatSchema);
