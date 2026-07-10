const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../config/logger.config');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.user._id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed`, 400), false);
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Upload a file
 * POST /api/v1/upload
 * Private
 */
exports.uploadFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(AppError.badRequest('No file uploaded'));
  }

  const file = req.file;
  
  // Determine file type based on mimetype
  let fileType = 'document';
  if (file.mimetype.startsWith('image/')) {
    fileType = 'image';
  } else if (file.mimetype.startsWith('audio/')) {
    fileType = 'audio';
  } else if (file.mimetype.startsWith('video/')) {
    fileType = 'video';
  }

  // Create file URL
  const fileUrl = `/uploads/${req.user._id}/${file.filename}`;

  const fileData = {
    url: fileUrl,
    type: fileType,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };

  logger.info(`File uploaded by ${req.user.username}: ${file.originalname}`);

  res.status(201).json(ApiResponse.created({ file: fileData }, 'File uploaded successfully'));
});

// Middleware for single file upload
exports.uploadSingle = upload.single('file');
