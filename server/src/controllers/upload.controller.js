const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../config/logger.config');

// Check if Cloudinary is configured
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info('☁️ Cloudinary cloud storage configured successfully');
} else {
  logger.info('💾 Cloudinary credentials missing. Falling back to local disk storage');
}

// Ensure uploads directory exists for local fallback
const uploadsDir = path.join(__dirname, '../../uploads');
if (!isCloudinaryConfigured && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage depending on Cloudinary configuration status
const storage = isCloudinaryConfigured
  ? multer.memoryStorage() // Store file in memory buffer for Cloudinary
  : multer.diskStorage({   // Fallback to local disk storage
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

  let fileUrl = '';

  if (isCloudinaryConfigured) {
    try {
      // Upload memory buffer directly to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `quick-chat/${req.user._id}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
      fileUrl = result.secure_url;
    } catch (err) {
      logger.error('Error uploading file to Cloudinary:', err);
      return next(new AppError('Failed to upload file to cloud storage', 500));
    }
  } else {
    // Local storage fallback URL
    fileUrl = `/uploads/${req.user._id}/${file.filename}`;
  }

  const fileData = {
    url: fileUrl,
    type: fileType,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  };

  logger.info(`File uploaded by ${req.user.username}: ${file.originalname} (${isCloudinaryConfigured ? 'Cloud' : 'Local'})`);

  res.status(201).json(ApiResponse.created({ file: fileData }, 'File uploaded successfully'));
});

// Middleware for single file upload
exports.uploadSingle = upload.single('file');
