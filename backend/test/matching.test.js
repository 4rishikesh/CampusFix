const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { createPerceptualHash, hammingDistance, isValidPerceptualHash, visualSimilarity } = require('../services/imageHash.service');
const { normalizeText, scoreItems, stemmedTokens, runMatchingForItem } = require('../services/matching.service');

const lost = { _id: 'lost-1', type: 'lost', status: 'active', title: 'Black leather wallet', description: 'Wallet with two cards and a zipper.', category: 'Wallet', location: 'Main library' };
const found = { _id: 'found-1', type: 'found', status: 'active', title: 'Black leather walet', description: 'A zippered wallet containing cards.', category: 'Wallet', location: 'Library' };

test('normalizes punctuation, whitespace, stop words, and stems tokens', () => {
  assert.equal(normalizeText('  Café—Wallet!!  '), 'cafe wallet');
  assert.deepEqual(stemmedTokens('The running wallets'), ['run', 'wallet']);
});

test('matches spelling mistakes and rejects unrelated text-only reports', () => {
  assert.equal(scoreItems(lost, found).isMatch, true);
  const unrelated = { ...found, title: 'Blue water bottle', description: 'Plastic bottle from gym', category: 'Bottle', location: 'Sports field' };
  assert.equal(scoreItems(lost, unrelated).isMatch, false);
});

test('creates and validates a genuine 64-bit perceptual image hash', async () => {
  const firstImage = await sharp(Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="white"/><circle cx="16" cy="16" r="12" fill="black"/></svg>')).png().toBuffer();
  const secondImage = await sharp(Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="white"/><rect x="32" y="32" width="24" height="24" fill="black"/></svg>')).png().toBuffer();
  const first = await createPerceptualHash(firstImage);
  const second = await createPerceptualHash(secondImage);
  assert.equal(isValidPerceptualHash(first), true);
  assert.equal(first.length, 16);
  assert.equal(hammingDistance(first, first), 0);
  assert.ok(hammingDistance(first, second) > 0 && hammingDistance(first, second) <= 64);
  await assert.rejects(() => createPerceptualHash(Buffer.from('not an image')), /Unable to process image/);
});

test('visual score is bounded and an image alone is not a definitive match', () => {
  assert.deepEqual(visualSimilarity('0000000000000000', '0000000000000000'), { distance: 0, score: 1 });
  const visualOnly = scoreItems({ ...lost, imageHash: 'aaaaaaaaaaaaaaaa', title: 'wallet', description: 'wallet', category: 'wallet', location: 'library' }, { ...found, imageHash: 'aaaaaaaaaaaaaaaa', title: 'green bicycle', description: 'mountain bicycle', category: 'Bicycle', location: 'stadium' });
  assert.equal(visualOnly.scores.visual, 1);
  assert.equal(visualOnly.isMatch, false);
});

test('matching service only pairs active opposite types and updates one pair idempotently', async () => {
  const records = new Map();
  let candidateFilter;
  const ItemModel = {
    findById: () => ({ select: async () => lost }),
    find: (filter) => { candidateFilter = filter; return { select: async () => [found] }; }
  };
  const MatchModel = {
    findOneAndUpdate: async (query, update) => {
      const key = `${query.lostItem}:${query.foundItem}`;
      const previous = records.get(key) || { ...query, status: update.$setOnInsert?.status };
      const next = { ...previous, ...update.$set };
      records.set(key, next);
      return next;
    }
  };
  await runMatchingForItem('lost-1', { ItemModel, MatchModel });
  await runMatchingForItem('lost-1', { ItemModel, MatchModel });
  assert.deepEqual(candidateFilter, { type: 'found', status: 'active' });
  assert.equal(records.size, 1);
  assert.equal(records.get('lost-1:found-1').status, 'candidate');
});
