const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageItem, validateItemInput } = require('../services/item.service');

const foundBody = { title: 'Keys', category: 'Keys', location: 'Library', dateFound: '2026-10-01', description: 'A ring with three keys' };

test('found-item input rejects crafted visibility and foreign fields', () => {
  assert.throws(() => validateItemInput({ ...foundBody, visibility: 'public' }, 'found'), /Unexpected field/);
  assert.throws(() => validateItemInput({ ...foundBody, imageHash: '0000000000000000' }, 'found'), /Unexpected field/);
});

test('item validation rejects missing, invalid, and future fields', () => {
  assert.throws(() => validateItemInput({ ...foundBody, title: '' }, 'found'), /title is required/);
  assert.throws(() => validateItemInput({ ...foundBody, dateFound: 'not-a-date' }, 'found'), /valid date/);
  assert.throws(() => validateItemInput({ ...foundBody, dateFound: '2099-01-01' }, 'found'), /cannot be in the future/);
});

test('only owners and administrators may manage a report', () => {
  const item = { user: { toString: () => 'owner' } };
  assert.equal(canManageItem(item, { id: 'owner', role: 'user' }), true);
  assert.equal(canManageItem(item, { id: 'other', role: 'user' }), false);
  assert.equal(canManageItem(item, { id: 'other', role: 'admin' }), true);
});
