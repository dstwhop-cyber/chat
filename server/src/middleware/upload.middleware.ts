import multer from 'multer';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { ApiError } from '@/utils/error';
import { HTTP_STATUS } from '@/constants';

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

// File filter for images only
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only image files are allowed'));
  }

  if (file.size > maxSize) {
    return cb(new ApiError(HTTP_STATUS.BAD_REQUEST, 'File size must be less than 5MB'));
  }

  cb(null, true);
};

// Initialize multer with configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Middleware to handle single file upload
export const uploadAvatar = upload.single('avatar');

// Middleware to handle errors from multer
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(HTTP_STATUS.BAD_REQUEST, 'File too large'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ApiError(HTTP_STATUS.BAD_REQUEST, 'Too many files uploaded'));
    }
  } else if (err) {
    return next(err);
  }
  next();
};

// Middleware to validate image dimensions
export const validateImageDimensions = (minWidth: number, minHeight: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return next();

    const { path: filePath } = req.file;
    
    // In a real implementation, you would use a library like sharp or jimp
    // to check the image dimensions
    // This is a placeholder implementation
    const checkDimensions = (path: string) => {
      // Implementation would go here
      return { width: minWidth, height: minHeight };
    };

    try {
      const { width, height } = checkDimensions(filePath);
      
      if (width < minWidth || height < minHeight) {
        return next(
          new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            `Image must be at least ${minWidth}x${minHeight} pixels`
          )
        );
      }
      
      next();
    } catch (error) {
      next(new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Error processing image'));
    }
  };
};
