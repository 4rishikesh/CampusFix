const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const configuredOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || !configuredOrigins.length || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS policy.'));
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }), authRoutes);

app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);

// Multer errors are deliberately returned as client errors rather than being
// allowed to fall through to Express's default HTML error page.
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Image must be 5 MB or smaller.' });
  }
  if (err.name === 'MulterError' || err.message === 'Only JPEG, PNG, and WebP images are allowed.') {
    return res.status(400).json({ message: err.message });
  }
  if (err.message === 'Origin is not allowed by CORS policy.') return res.status(403).json({ message: err.message });
  console.error(err);
  return res.status(500).json({ message: 'Server error' });
});

module.exports = app;
