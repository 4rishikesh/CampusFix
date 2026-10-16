const express = require('express');
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware, requireAdmin);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/block', adminController.blockUser);
router.patch('/users/:id/unblock', adminController.unblockUser);
router.get('/items', adminController.getItems);
router.patch('/items/:id/moderation', adminController.moderateItem);

module.exports = router;
