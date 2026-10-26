const Item = require('../models/Item.model');
const Match = require('../models/Match.model');
const Chat = require('../models/Chat.model');
const { createPerceptualHash } = require('../services/imageHash.service');
const { runMatchingForItem } = require('../services/matching.service');
const { canManageItem, validateItemInput } = require('../services/item.service');
const { deleteFromCloudinary, uploadToCloudinary } = require('../middleware/upload.middleware');

function sendError(res, error) {
  const status = error.status || (error.code === 'CLOUDINARY_UNAVAILABLE' ? 503 : 500);
  if (status >= 500) console.error(error);
  return res.status(status).json({ message: status === 500 ? 'Server error' : error.message });
}

async function buildImageData(file) {
  if (!file) return {};
  const imageHash = await createPerceptualHash(file.buffer);
  let upload;
  try {
    upload = await uploadToCloudinary(file.buffer, file.mimetype);
  } catch (error) {
    if (error.code === 'CLOUDINARY_UNAVAILABLE') throw error;
    const uploadError = new Error('Image upload is temporarily unavailable. Please try again later.');
    uploadError.status = 502;
    throw uploadError;
  }
  return { imageUrl: upload.url, imagePublicId: upload.publicId, imageHash };
}

async function dismissMatchesForItem(itemId) {
  await Match.updateMany(
    { status: 'candidate', $or: [{ lostItem: itemId }, { foundItem: itemId }] },
    { $set: { status: 'dismissed' } }
  );
  await Chat.updateMany(
    { status: 'active', $or: [{ lostItem: itemId }, { foundItem: itemId }] },
    { $set: { status: 'closed', closedReason: 'Associated report was archived or removed.' } }
  );
}

async function createItem(req, res, type) {
  try {
    const data = validateItemInput(req.body, type);
    const image = await buildImageData(req.file);
    const item = await Item.create({
      ...data,
      ...image,
      type,
      visibility: type === 'found' ? 'private' : data.visibility,
      user: req.user.id
    });
    // For the current small deployment this bounded opposite-type query runs
    // after persistence. It is deterministic and can move to a queue later.
    await runMatchingForItem(item._id);
    return res.status(201).json(item);
  } catch (error) {
    return sendError(res, error);
  }
}

exports.reportLostItem = (req, res) => createItem(req, res, 'lost');
exports.reportFoundItem = (req, res) => createItem(req, res, 'found');

exports.getLostItems = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    // $ne keeps reports created before moderationState existed compatible while
    // excluding reports held by an administrator.
    const filter = { type: 'lost', visibility: 'public', status: 'active', moderationState: { $ne: 'held' } };
    if (req.query.category) filter.category = new RegExp(`^${String(req.query.category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);
      if (search) filter.$or = ['title', 'description', 'location'].map((field) => ({ [field]: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));
    }
    const [items, total] = await Promise.all([
      Item.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name'),
      Item.countDocuments(filter)
    ]);
    return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getMyItems = async (req, res) => {
  try {
    const items = await Item.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('user', 'name');
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    const isOwnerOrAdmin = canManageItem(item, req.user);
    if (item.type === 'found' && !isOwnerOrAdmin) return res.status(403).json({ message: 'Not authorized to view this found report.' });
    if (item.type === 'lost' && item.visibility === 'private' && !isOwnerOrAdmin) return res.status(403).json({ message: 'Not authorized to view this item.' });
    return res.json(item);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).select('+imagePublicId +imageHash');
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (!canManageItem(item, req.user)) return res.status(403).json({ message: 'Not authorized.' });
    if (item.type === 'found' && req.body.visibility !== undefined) {
      return res.status(422).json({ message: 'Found item visibility is server-controlled and always private.' });
    }
    const data = validateItemInput(req.body, item.type, { partial: true });
    const newImage = await buildImageData(req.file);
    const oldPublicId = req.file ? item.imagePublicId : null;
    Object.assign(item, data, newImage);
    if (item.type === 'found') item.visibility = 'private';
    await item.save();
    if (oldPublicId) {
      try { await deleteFromCloudinary(oldPublicId); } catch (error) { console.error('Unable to remove replaced image', error); }
    }
    await runMatchingForItem(item._id);
    return res.json(item);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.archiveItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (!canManageItem(item, req.user)) return res.status(403).json({ message: 'Not authorized.' });
    item.status = 'archived';
    await item.save();
    await dismissMatchesForItem(item._id);
    return res.json(item);
  } catch (error) {
    return sendError(res, error);
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).select('+imagePublicId');
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (!canManageItem(item, req.user)) return res.status(403).json({ message: 'Not authorized.' });
    if (item.imagePublicId) {
      try { await deleteFromCloudinary(item.imagePublicId); } catch (error) { console.error('Unable to remove image', error); }
    }
    await dismissMatchesForItem(item._id);
    await item.deleteOne();
    return res.json({ message: 'Item removed.' });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getMyMatches = async (req, res) => {
  try {
    const ownItems = await Item.find({ user: req.user.id }).select('_id');
    const ownIds = ownItems.map((item) => item._id);
    const matches = await Match.find({ status: 'candidate', $or: [{ lostItem: { $in: ownIds } }, { foundItem: { $in: ownIds } }] })
      .sort({ updatedAt: -1 })
      .populate('lostItem', 'title category imageUrl user')
      .populate('foundItem', 'title category imageUrl user');
    const results = matches.map((match) => {
      const ownItem = String(match.lostItem.user) === req.user.id ? match.lostItem : match.foundItem;
      const otherItem = ownItem === match.lostItem ? match.foundItem : match.lostItem;
      return { id: match._id, ownItem: { id: ownItem._id, title: ownItem.title }, potentialItem: { title: otherItem.title, category: otherItem.category, imageUrl: otherItem.imageUrl }, score: match.scores.combined, updatedAt: match.updatedAt };
    });
    return res.json(results);
  } catch (error) {
    return sendError(res, error);
  }
};
