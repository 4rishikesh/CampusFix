const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  location: { type: String, required: true, trim: true, maxlength: 120 },
  dateLost: { type: Date },
  dateFound: { type: Date },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  imageUrl: { type: String },
  imagePublicId: { type: String, select: false },
  imageHash: { type: String, select: false, match: /^[0-9a-f]{16}$/ },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  status: { type: String, enum: ['active', 'resolved', 'archived'], default: 'active' },
  // Held reports are retained as moderation evidence but are not public or matchable.
  moderationState: { type: String, enum: ['clear', 'held'], default: 'clear' },
  type: { type: String, enum: ['lost', 'found'], default: 'lost' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

itemSchema.index({ type: 1, status: 1, category: 1 });
itemSchema.index({ user: 1, createdAt: -1 });
itemSchema.index({ type: 1, visibility: 1, status: 1, createdAt: -1 });
itemSchema.index({ moderationState: 1, type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Item', itemSchema);
