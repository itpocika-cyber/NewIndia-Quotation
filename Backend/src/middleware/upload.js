import multer from 'multer';

// Use memory storage so buffer is immediately streamed to Cloudinary
const storage = multer.memoryStorage();

// Validate file type: jpg, jpeg, png, webp only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
    err.status = 400;
    cb(err, false);
  }
};

// Max 2MB file size limit
const multerUpload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter
}).single('image');

/**
 * Middleware wrapper to catch and format multer errors (e.g. file size exceeded)
 */
export function handleProductImageUpload(req, res, next) {
  multerUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size too large. Maximum allowed product image size is 2MB.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(err.status || 400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
}

export default handleProductImageUpload;
