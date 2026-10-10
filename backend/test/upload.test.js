const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const sharp = require('sharp');
const { upload, uploadToCloudinary } = require('../middleware/upload.middleware');

function uploadApp() {
  const app = express();
  app.post('/image', upload.single('image'), (req, res) => res.status(201).json({ type: req.file.mimetype }));
  app.use((error, req, res, next) => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message }));
  return app;
}

test('upload middleware accepts a supported image and rejects invalid or oversized files', async () => {
  const validPng = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#112233' } }).png().toBuffer();
  await request(uploadApp()).post('/image').attach('image', validPng, { filename: 'item.png', contentType: 'image/png' }).expect(201);
  const invalid = await request(uploadApp()).post('/image').attach('image', Buffer.from('not an image'), { filename: 'item.txt', contentType: 'text/plain' }).expect(400);
  assert.match(invalid.body.message, /JPEG, PNG, and WebP/);
  await request(uploadApp()).post('/image').attach('image', Buffer.alloc((5 * 1024 * 1024) + 1), { filename: 'large.png', contentType: 'image/png' }).expect(413);
});

test('Cloudinary upload fails clearly when its credentials are unavailable', async () => {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => { delete process.env[key]; });
  await assert.rejects(() => uploadToCloudinary(Buffer.from('image'), 'image/png'), { code: 'CLOUDINARY_UNAVAILABLE' });
  Object.entries(saved).forEach(([key, value]) => { if (value === undefined) delete process.env[key]; else process.env[key] = value; });
});
