const natural = require('natural');
const Item = require('../models/Item.model');
const Match = require('../models/Match.model');
const { visualSimilarity } = require('./imageHash.service');

const STOP_WORDS = new Set(['a', 'an', 'and', 'at', 'for', 'from', 'in', 'is', 'it', 'my', 'of', 'on', 'the', 'to', 'with']);
const CONFIG = Object.freeze({
  weights: { text: 0.55, category: 0.2, location: 0.15, visual: 0.1 },
  threshold: 0.62,
  strongVisualThreshold: 0.9,
  strongVisualMatchThreshold: 0.54
});

function clampScore(value) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalizeText(value = '') {
  return String(value).toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemmedTokens(value) {
  return normalizeText(value).split(' ').filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token))
    .map((token) => natural.PorterStemmer.stem(token));
}

function jaroWinkler(first, second) {
  const a = normalizeText(first);
  const b = normalizeText(second);
  if (!a || !b) return 0;
  return clampScore(natural.JaroWinklerDistance(a, b));
}

function tokenSimilarity(first, second) {
  const firstTokens = stemmedTokens(first);
  const secondTokens = stemmedTokens(second);
  if (!firstTokens.length || !secondTokens.length) return 0;
  const bestScores = firstTokens.map((token) => Math.max(...secondTokens.map((other) => jaroWinkler(token, other))));
  return clampScore(bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length);
}

function fieldSimilarity(first, second) {
  return clampScore((jaroWinkler(first, second) * 0.55) + (tokenSimilarity(first, second) * 0.45));
}

function scoreItems(lostItem, foundItem, config = CONFIG) {
  if (lostItem.type !== 'lost' || foundItem.type !== 'found') {
    throw new Error('Matching only supports a lost item paired with a found item.');
  }
  const titleScore = fieldSimilarity(lostItem.title, foundItem.title);
  const descriptionScore = fieldSimilarity(lostItem.description, foundItem.description);
  const text = clampScore((titleScore * 0.6) + (descriptionScore * 0.4));
  const category = fieldSimilarity(lostItem.category, foundItem.category);
  const location = fieldSimilarity(lostItem.location, foundItem.location);
  const visual = visualSimilarity(lostItem.imageHash, foundItem.imageHash);
  const availableWeight = visual.score === null
    ? config.weights.text + config.weights.category + config.weights.location
    : 1;
  const weighted = (text * config.weights.text)
    + (category * config.weights.category)
    + (location * config.weights.location)
    + ((visual.score || 0) * config.weights.visual);
  const combined = clampScore(weighted / availableWeight);
  const threshold = visual.score !== null && visual.score >= config.strongVisualThreshold
    ? config.strongVisualMatchThreshold
    : config.threshold;
  return {
    scores: { text, category, location, visual: visual.score, imageDistance: visual.distance, combined },
    isMatch: combined >= threshold,
    threshold
  };
}

async function runMatchingForItem(itemId, { ItemModel = Item, MatchModel = Match } = {}) {
  const item = await ItemModel.findById(itemId).select('+imageHash');
  if (!item || item.status !== 'active') return [];
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  const candidates = await ItemModel.find({ type: oppositeType, status: 'active' }).select('+imageHash');
  const results = [];
  for (const candidate of candidates) {
    const lostItem = item.type === 'lost' ? item : candidate;
    const foundItem = item.type === 'found' ? item : candidate;
    const outcome = scoreItems(lostItem, foundItem);
    const pair = { lostItem: lostItem._id, foundItem: foundItem._id };
    if (!outcome.isMatch) {
      // Preserve human-reviewed outcomes, but do not leave stale automatic
      // candidates after a material report edit.
      await MatchModel.findOneAndUpdate({ ...pair, status: 'candidate' }, { $set: { status: 'dismissed', scores: outcome.scores } });
      continue;
    }
    const match = await MatchModel.findOneAndUpdate(
      pair,
      { $set: { scores: outcome.scores, algorithmVersion: 'week3-v1' }, $setOnInsert: { status: 'candidate' } },
      { new: true, upsert: true, runValidators: true }
    );
    results.push(match);
  }
  return results;
}

// Future notification/chat modules can subscribe here.  This intentionally has
// no side effects until those modules exist.
async function publishPotentialMatches() { return undefined; }

module.exports = {
  CONFIG, fieldSimilarity, jaroWinkler, normalizeText, publishPotentialMatches,
  runMatchingForItem, scoreItems, stemmedTokens, tokenSimilarity
};
