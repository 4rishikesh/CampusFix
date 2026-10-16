const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const { normalizeEmail, validateNitwRegistrationEmail } = require('../services/email.service');

const PRIVILEGED_FIELDS = new Set(['role', 'isBlocked', 'blockedAt', 'blockedBy', 'blockReason']);

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

function createToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT configuration is unavailable.');
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Request body must be an object.' };
  const keys = Object.keys(body);
  const privileged = keys.find((key) => PRIVILEGED_FIELDS.has(key));
  if (privileged) return { error: `The ${privileged} field cannot be set during registration.` };
  const unexpected = keys.find((key) => !['name', 'email', 'password'].includes(key));
  if (unexpected) return { error: `Unexpected field: ${unexpected}.` };
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) return { error: 'Name must be between 2 and 100 characters.' };
  const emailValidation = validateNitwRegistrationEmail(body.email);
  if (emailValidation.error) return emailValidation;
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) return { error: 'Password must be between 8 and 128 characters.' };
  return { email: emailValidation.email };
}

exports.register = async (req, res) => {
  try {
    const registration = validateRegistration(req.body);
    if (registration.error) return res.status(422).json({ message: registration.error });
    const { name, email, password } = req.body;
    let user = await User.findOne({ email: registration.email });
    if (user) return res.status(409).json({ message: 'An account with this email already exists.' });

    user = new User({ name: name.trim(), email: registration.email, password });
    await user.save();

    const token = createToken(user);
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    if (err.message === 'JWT configuration is unavailable.') return res.status(500).json({ message: 'Authentication is temporarily unavailable.' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(422).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });
    if (user.isBlocked) return res.status(403).json({ code: 'ACCOUNT_BLOCKED', message: 'This account has been blocked. Contact a campus administrator for help.' });

    const token = createToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    if (err.message === 'JWT configuration is unavailable.') return res.status(500).json({ message: 'Authentication is temporarily unavailable.' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('_id name email role createdAt updatedAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(safeUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports.safeUser = safeUser;
