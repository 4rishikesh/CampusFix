const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
