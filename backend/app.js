const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const itemRoutes = require('./routes/item.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

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
  console.error(err);
  return res.status(500).json({ message: 'Server error' });
});

module.exports = app;
