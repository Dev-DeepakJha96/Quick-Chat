const express = require('express');

const router = express.Router();

const authRoutes = require('./auth.routes');
const conversationRoutes = require('./conversation.routes');
const messageRoutes = require('./message.routes');
const userRoutes = require('./user.routes');

router.use('/auth', authRoutes);
router.use('/conversations',conversationRoutes);
router.use('/messages',messageRoutes);
router.use('/users', userRoutes); 

// ---------------------------------------------------------------

module.exports = router;
