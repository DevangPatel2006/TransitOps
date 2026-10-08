const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const ApiError = require('./ApiError');

const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Upload a document buffer to Cloudinary (or local fallback if unconfigured)
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} originalname - Original file name
 * @param {string} mimetype - MIME type
 * @returns {Promise<{ filePath: string, fileName: string }>}
 */
const uploadDocument = async (buffer, originalname, mimetype) => {
  // Validate allowed extensions and mimetypes
  const ext = path.extname(originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  const allowedMimeTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(mimetype)) {
    throw new ApiError(400, 'Invalid file type. Only PDF and image files (PNG, JPG, WEBP) are allowed.');
  }

  if (isCloudinaryConfigured()) {
    // Determine resource_type:
    // Images: 'image', Documents/PDFs: 'raw'
    const isImage = mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    const timestamp = Date.now();
    const cleanBaseName = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    // For raw files in Cloudinary, retaining the extension in public_id is critical for proper delivery
    const publicId = `transitops/vehicle-docs/${timestamp}_${cleanBaseName}${ext}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: false,
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            console.error('[StorageService] Cloudinary upload error:', error);
            return reject(new ApiError(500, `Cloud storage upload failed: ${error.message}`));
          }
          resolve({
            filePath: result.secure_url,
            fileName: originalname,
          });
        }
      );
      uploadStream.end(buffer);
    });
  }

  // Fallback to local storage (for local development when Cloudinary credentials are not configured)
  const localUploadDir = path.join(__dirname, '../../uploads/vehicle-docs');
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const localFileName = `document-${uniqueSuffix}${ext}`;
  const fullPath = path.join(localUploadDir, localFileName);

  fs.writeFileSync(fullPath, buffer);

  return {
    filePath: fullPath,
    fileName: originalname,
  };
};

/**
 * Delete a document from Cloudinary or local disk
 * @param {string} filePath - Stored URL or local path
 */
const deleteDocument = async (filePath) => {
  if (!filePath) return;

  // Cloudinary storage
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    if (!isCloudinaryConfigured()) {
      console.warn('[StorageService] Cloudinary not configured; skipping remote object deletion.');
      return;
    }

    try {
      const urlWithoutParams = filePath.split('?')[0];
      const isRaw = urlWithoutParams.includes('/raw/upload/') || urlWithoutParams.endsWith('.pdf');
      const resourceType = isRaw ? 'raw' : 'image';

      const uploadIndex = filePath.indexOf('/upload/');
      if (uploadIndex !== -1) {
        let remainder = filePath.substring(uploadIndex + '/upload/'.length);
        remainder = remainder.replace(/^v\d+\//, '');
        const publicId = isRaw ? remainder : remainder.replace(/\.[^/.]+$/, '');

        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        console.log(`[StorageService] Cloudinary asset destroyed: ${publicId}`);
      }
    } catch (err) {
      console.error('[StorageService] Failed to delete Cloudinary asset:', err.message);
    }
    return;
  }

  // Local filesystem storage fallback
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[StorageService] Local file deleted: ${filePath}`);
    }
  } catch (err) {
    console.error(`[StorageService] Failed to delete local file: ${filePath}`, err.message);
  }
};

/**
 * Stream or download document securely to Express response
 * @param {object} doc - VehicleDocument database record
 * @param {object} res - Express response object
 */
const streamDocumentToResponse = async (doc, res) => {
  if (!doc || !doc.file_path) {
    throw new ApiError(404, 'Document record has no file reference');
  }

  const isRemote = doc.file_path.startsWith('http://') || doc.file_path.startsWith('https://');

  if (isRemote) {
    return new Promise((resolve, reject) => {
      const client = doc.file_path.startsWith('https') ? https : http;

      const request = client.get(doc.file_path, (remoteRes) => {
        if (remoteRes.statusCode === 404) {
          return reject(new ApiError(404, 'Document file not found in cloud storage'));
        }

        if (remoteRes.statusCode >= 400) {
          return reject(new ApiError(remoteRes.statusCode, `Cloud storage returned status ${remoteRes.statusCode}`));
        }

        const contentType = remoteRes.headers['content-type'] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(doc.file_name)}"`
        );

        if (remoteRes.headers['content-length']) {
          res.setHeader('Content-Length', remoteRes.headers['content-length']);
        }

        remoteRes.pipe(res);
        remoteRes.on('end', () => resolve());
        remoteRes.on('error', (err) => reject(new ApiError(500, `Stream error: ${err.message}`)));
      });

      request.on('error', (err) => {
        reject(new ApiError(500, `Failed to retrieve document from storage: ${err.message}`));
      });
    });
  }

  // Local filesystem fallback (backward compatible for existing records)
  if (!fs.existsSync(doc.file_path)) {
    throw new ApiError(404, 'Physical file not found on disk');
  }

  return new Promise((resolve, reject) => {
    res.download(doc.file_path, doc.file_name, (err) => {
      if (err) {
        if (!res.headersSent) {
          return reject(new ApiError(500, 'Error downloading file from server'));
        }
      }
      resolve();
    });
  });
};

module.exports = {
  isCloudinaryConfigured,
  uploadDocument,
  deleteDocument,
  streamDocumentToResponse,
};
