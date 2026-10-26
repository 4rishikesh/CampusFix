const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');
const chatRoutes = require('./routes/chat.routes');

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

const isDev = process.env.NODE_ENV !== 'production';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 5000 : 300,
  message: { message: 'Too many requests, please try again in a few minutes.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 1000 : 100,
  message: { message: 'Too many authentication attempts. Please wait a few moments before trying again.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

app.use(generalLimiter);
app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);

// Client and system error formatting middleware
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Image must be 5 MB or smaller.' });
  }
  if (err.name === 'MulterError' || err.message === 'Only JPEG, PNG, and WebP images are allowed.') {
    return res.status(400).json({ message: err.message });
  }
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({ message: 'Invalid JSON request payload.' });
  }
  if (err.message === 'Origin is not allowed by CORS policy.') {
    return res.status(403).json({ message: err.message });
  }
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({ message: err.message || 'Server error' });
});

module.exports = app;
