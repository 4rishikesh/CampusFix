process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-long-enough';
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const User = require('../models/User.model');
const Item = require('../models/Item.model');
const Match = require('../models/Match.model');
const { NITW_REGISTRATION_EMAIL_MESSAGE } = require('../services/email.service');

let mongo;

function authorization(user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

async function makeUser(attributes = {}) {
  return User.create({
    name: 'Campus User',
    email: `user-${Math.random().toString(16).slice(2)}@example.edu`,
    password: 'secure-password',
    ...attributes
  });
}

async function makeItem(user, attributes = {}) {
  return Item.create({
    title: 'Black wallet', category: 'Wallet', location: 'Library', dateLost: new Date('2026-10-01'),
    description: 'A black wallet with campus card.', type: 'lost', visibility: 'public', user: user._id,
    ...attributes
  });
}

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test.beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Item.deleteMany({}), Match.deleteMany({})]);
});

test('ordinary users cannot reach administration endpoints and registration rejects privilege fields', async () => {
  const ordinary = await makeUser({ email: 'ordinary@example.edu' });
  await request(app).get('/api/admin/users').set(authorization(ordinary)).expect(403);

  const response = await request(app).post('/api/auth/register').send({
    name: 'Forged Admin', email: 'forged@example.edu', password: 'secure-password', role: 'admin', isBlocked: false
  }).expect(422);
  assert.match(response.body.message, /cannot be set during registration/);
  assert.equal(await User.exists({ email: 'forged@example.edu' }), null);
});

test('public registration accepts only normalized exact NITW student and faculty email domains', async () => {
  const student = await request(app).post('/api/auth/register').send({
    name: 'NITW Student', email: '  Student.User@STUDENT.NITW.AC.IN  ', password: 'secure-password'
  }).expect(201);
  assert.equal(student.body.user.email, 'student.user@student.nitw.ac.in');
  assert.equal(student.body.user.role, 'user');
  const storedStudent = await User.findOne({ email: 'student.user@student.nitw.ac.in' });
  assert.notEqual(storedStudent.password, 'secure-password');

  const faculty = await request(app).post('/api/auth/register').send({
    name: 'NITW Faculty', email: 'faculty.member@nitw.ac.in', password: 'secure-password'
  }).expect(201);
  assert.equal(faculty.body.user.email, 'faculty.member@nitw.ac.in');
  assert.equal(faculty.body.user.role, 'user');

  await request(app).post('/api/auth/register').send({
    name: 'Duplicate Student', email: ' STUDENT.USER@student.nitw.ac.in ', password: 'secure-password'
  }).expect(409);
});

test('public registration rejects non-NITW and lookalike email domains', async () => {
  const invalidEmails = [
    'person@gmail.com',
    'person@student.nitw.ac.in.example.com',
    'person@nitw.ac.in.fake.com',
    'person@sub.nitw.ac.in',
    'person@ student.nitw.ac.in',
    'person@student.nitw.ac.in .'
  ];

  for (const email of invalidEmails) {
    const response = await request(app).post('/api/auth/register').send({ name: 'Invalid Email', email, password: 'secure-password' }).expect(422);
    assert.equal(response.body.message, NITW_REGISTRATION_EMAIL_MESSAGE);
  }
});

test('legacy administrator login remains available without an NITW registration domain', async () => {
  const admin = await makeUser({ name: 'Legacy Admin', email: 'legacy-admin@example.edu', role: 'admin' });
  const response = await request(app).post('/api/auth/login').send({ email: ' LEGACY-ADMIN@EXAMPLE.EDU ', password: 'secure-password' }).expect(200);
  assert.equal(response.body.user.id, String(admin._id));
  assert.equal(response.body.user.role, 'admin');
  assert.ok(response.body.token);
});

test('an administrator can block and unblock a user, preserve safe data, and hold reports', async () => {
  const admin = await makeUser({ name: 'Campus Admin', email: 'admin@example.edu', role: 'admin' });
  const member = await makeUser({ name: 'Reported Member', email: 'member@example.edu' });
  const item = await makeItem(member);
  await Match.create({
    lostItem: item._id,
    foundItem: (await makeItem(admin, { type: 'found', visibility: 'private', dateLost: undefined, dateFound: new Date('2026-10-02') }))._id,
    status: 'candidate', scores: { text: 0.8, category: 1, location: 0.8, combined: 0.85 }
  });

  const blocked = await request(app).patch(`/api/admin/users/${member._id}/block`).set(authorization(admin)).send({ reason: 'Repeated fraudulent reports' }).expect(200);
  assert.equal(blocked.body.user.isBlocked, true);
  assert.equal(blocked.body.user.blockReason, 'Repeated fraudulent reports');
  assert.equal(blocked.body.heldReports, 1);
  assert.equal(Object.hasOwn(blocked.body.user, 'password'), false);

  const held = await Item.findById(item._id);
  assert.equal(held.moderationState, 'held');
  assert.equal((await Match.findOne()).status, 'dismissed');
  await request(app).get('/api/items/lost').expect(200).expect((response) => assert.equal(response.body.items.length, 0));

  // The JWT was issued before the block and is still cryptographically valid.
  await request(app).post('/api/items/lost').set(authorization(member)).send({
    title: 'Blocked report', category: 'Other', location: 'Campus', dateLost: '2026-10-03', description: 'This mutation must be denied.', visibility: 'public'
  }).expect(403).expect((response) => assert.equal(response.body.code, 'ACCOUNT_BLOCKED'));
  await request(app).put(`/api/items/${item._id}`).set(authorization(member)).send({
    title: 'Edited wallet', category: 'Wallet', location: 'Library', dateLost: '2026-10-01', description: 'This mutation must be denied.', visibility: 'public'
  }).expect(403);
  await request(app).patch(`/api/items/${item._id}/archive`).set(authorization(member)).expect(403).expect((response) => assert.equal(response.body.code, 'ACCOUNT_BLOCKED'));
  await request(app).delete(`/api/items/${item._id}`).set(authorization(member)).expect(403);
  await request(app).get('/api/auth/profile').set(authorization(member)).expect(403);

  await request(app).patch(`/api/admin/users/${member._id}/unblock`).set(authorization(admin)).expect(200);
  const unblocked = await User.findById(member._id);
  assert.equal(unblocked.isBlocked, false);
  assert.equal(unblocked.blockReason, undefined);
  assert.equal((await Item.findById(item._id)).moderationState, 'held');
});

test('administrators cannot block themselves or another administrator', async () => {
  const firstAdmin = await makeUser({ email: 'first-admin@example.edu', role: 'admin' });
  const secondAdmin = await makeUser({ email: 'second-admin@example.edu', role: 'admin' });
  await request(app).patch(`/api/admin/users/${firstAdmin._id}/block`).set(authorization(firstAdmin)).send({}).expect(422);
  await request(app).patch(`/api/admin/users/${secondAdmin._id}/block`).set(authorization(firstAdmin)).send({}).expect(422);
});

test('private report confidentiality remains intact while administrators can inspect it', async () => {
  const admin = await makeUser({ email: 'admin@example.edu', role: 'admin' });
  const owner = await makeUser({ email: 'owner@example.edu' });
  const stranger = await makeUser({ email: 'stranger@example.edu' });
  const privateItem = await makeItem(owner, { visibility: 'private' });

  await request(app).get(`/api/items/${privateItem._id}`).set(authorization(stranger)).expect(403);
  await request(app).get(`/api/items/${privateItem._id}`).set(authorization(admin)).expect(200).expect((response) => assert.equal(response.body._id, String(privateItem._id)));
  await request(app).get('/api/admin/items').set(authorization(admin)).expect(200).expect((response) => assert.equal(response.body.items[0].visibility, 'private'));
});

test('administrators can release or archive held reports through moderation controls', async () => {
  const admin = await makeUser({ email: 'admin@example.edu', role: 'admin' });
  const owner = await makeUser({ email: 'owner@example.edu' });
  const item = await makeItem(owner, { moderationState: 'held' });

  await request(app).patch(`/api/admin/items/${item._id}/moderation`).set(authorization(admin)).send({ action: 'release' }).expect(200).expect((response) => assert.equal(response.body.moderationState, 'clear'));
  await request(app).patch(`/api/admin/items/${item._id}/moderation`).set(authorization(admin)).send({ action: 'archive' }).expect(200).expect((response) => assert.equal(response.body.status, 'archived'));
});
