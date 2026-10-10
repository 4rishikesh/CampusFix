const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  lostItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  foundItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  status: { type: String, enum: ['candidate', 'dismissed', 'confirmed'], default: 'candidate' },
  scores: {
    text: { type: Number, required: true, min: 0, max: 1 },
    category: { type: Number, required: true, min: 0, max: 1 },
    location: { type: Number, required: true, min: 0, max: 1 },
    visual: { type: Number, min: 0, max: 1 },
    combined: { type: Number, required: true, min: 0, max: 1 },
    imageDistance: { type: Number, min: 0, max: 64 }
  },
  algorithmVersion: { type: String, default: 'week3-v1' }
}, { timestamps: true });

// A unique pair makes rerunning the engine idempotent.
matchSchema.index({ lostItem: 1, foundItem: 1 }, { unique: true });
matchSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('Match', matchSchema);
