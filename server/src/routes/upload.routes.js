const express = require('express');
const router = express.Router();

// Controllers
const uploadController = require('../controllers/upload.controller');

// Middleware
const { protect } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

/**
 * @route POST /api/v1/upload
 * @desc Upload a file
 * @access Private
 */
router.post('/', uploadController.uploadSingle, uploadController.uploadFile);

module.exports = router;
