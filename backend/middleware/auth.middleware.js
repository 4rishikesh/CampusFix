const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

function blockedResponse(res) {
  return res.status(403).json({
    code: 'ACCOUNT_BLOCKED',
    message: 'This account has been blocked. Contact a campus administrator for help.'
  });
}

const authMiddleware = async (req, res, next) => {
  const authorization = req.header('Authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  if (!token) return res.status(401).json({ message: 'Authentication is required.' });

  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT configuration is unavailable.');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name email role isBlocked').lean();
    if (!user) return res.status(401).json({ message: 'Your account is no longer available.' });
    if (user.isBlocked) return blockedResponse(res);
    req.user = { id: String(user._id), role: user.role, name: user.name, email: user.email };
    next();
  } catch (err) {
    if (err.message === 'JWT configuration is unavailable.') {
      console.error(err.message);
      return res.status(500).json({ message: 'Authentication is temporarily unavailable.' });
    }
    return res.status(401).json({ message: 'Your session is invalid or has expired.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' });
  return next();
};

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.blockedResponse = blockedResponse;
