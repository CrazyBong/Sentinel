import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File type mapping
const FILE_TYPE_MAP = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/avi': 'video',
  'video/mov': 'video',
  'video/wmv': 'video',
  'video/webm': 'video',
  'audio/mp3': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'audio/m4a': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'application/vnd.ms-powerpoint': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'text/plain': 'document',
  'text/csv': 'document',
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive'
};

// Storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'evidence');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = Object.keys(FILE_TYPE_MAP);
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB default

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }

  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    files: 10 // Max 10 files per request
  }
});

// File processing functions
export const processFile = async (file, campaignId) => {
  try {
    const fileType = FILE_TYPE_MAP[file.mimetype] || 'other';
    const filePath = file.path;
    const fileStats = await fs.stat(filePath);
    
    // Generate file hashes
    const fileBuffer = await fs.readFile(filePath);
    const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Extract metadata based on file type
    let metadata = {
      hash: {
        md5: md5Hash,
        sha256: sha256Hash
      },
      created: fileStats.birthtime,
      modified: fileStats.mtime
    };

    let thumbnailUrl = null;

    // Process images
    if (fileType === 'image') {
      try {
        const imageMetadata = await sharp(filePath).metadata();
        metadata.dimensions = {
          width: imageMetadata.width,
          height: imageMetadata.height
        };
        metadata.format = imageMetadata.format;
        metadata.colorSpace = imageMetadata.space;
        metadata.compression = imageMetadata.compression;

        // Generate thumbnail
        const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
        await fs.mkdir(thumbnailDir, { recursive: true });
        
        const thumbnailFilename = `thumb_${path.basename(file.filename, path.extname(file.filename))}.webp`;
        const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
        
        await sharp(filePath)
          .resize(300, 300, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);
        
        thumbnailUrl = `/uploads/thumbnails/${thumbnailFilename}`;
      } catch (imageError) {
        console.error('Image processing error:', imageError);
      }
    }

    // Process videos (basic metadata)
    if (fileType === 'video') {
      // Note: For full video processing, you'd use ffmpeg
      // This is a simplified version
      metadata.format = path.extname(file.originalname).slice(1);
    }

    return {
      fileType,
      metadata,
      thumbnailUrl,
      url: `/uploads/evidence/${file.filename}`,
      hash: sha256Hash
    };
  } catch (error) {
    console.error('File processing error:', error);
    throw error;
  }
};

// Duplicate detection
export const checkDuplicate = async (hash, campaignId) => {
  const Evidence = (await import('../models/evidence.model.js')).default;
  const duplicate = await Evidence.findOne({
    'metadata.hash.sha256': hash,
    campaign: campaignId,
    isArchived: false
  });
  return duplicate;
};

// File validation
export const validateFile = (file) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return errors;
  }

  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
  }

  const allowedMimes = Object.keys(FILE_TYPE_MAP);
  if (!allowedMimes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} not allowed`);
  }

  return errors;
};

export { upload, FILE_TYPE_MAP };