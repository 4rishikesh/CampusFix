const express = require('express');
const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/initiate', chatController.initiateChat);
router.get('/', chatController.getMyChats);
router.get('/:id', chatController.getChatById);
router.get('/:id/messages', chatController.getMessages);
router.post('/:id/messages', chatController.sendMessage);
router.post('/:id/resolve', chatController.resolveChat);
router.patch('/:id/close', chatController.closeChat);

module.exports = router;
