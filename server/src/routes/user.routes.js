const express = require('express');
const router = express.Router();

const { protect } = require('../middlewares/auth.middlware');
const userController = require('../controllers/user.controller');

router.use(protect);

router.get('/search', userController.searchUsers);

module.exports = router;
