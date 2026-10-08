const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const validate = require('../../utils/validators');
const {
  uploadDocumentSchema,
  queryExpiringDocsSchema,
  idParamSchema,
  docIdParamSchema,
} = require('./vehicle-documents.validators');
const vehicleDocumentsController = require('./vehicle-documents.controller');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.use(authenticate);

const ApiError = require('../../utils/ApiError');

// Memory storage for persistent cloud uploads without local disk dependency
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];

    if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Invalid file type. Only PDF and image files (PNG, JPG, WEBP) are allowed.'));
    }
  },
});

// Routes
router.post(
  '/vehicles/:id/documents',
  requireRole('FLEET_MANAGER'),
  upload.single('document'),
  (req, res, next) => {
    // Validate request body after multer parses multipart form
    validate(idParamSchema)(req, res, (err) => {
      if (err) return next(err);
      validate(uploadDocumentSchema)(req, res, next);
    });
  },
  vehicleDocumentsController.uploadDocument
);

router.get(
  '/vehicles/:id/documents',
  validate(idParamSchema),
  vehicleDocumentsController.getDocumentsForVehicle
);

router.get(
  '/vehicle-documents/:docId/download',
  validate(docIdParamSchema),
  vehicleDocumentsController.downloadDocument
);

router.delete(
  '/vehicle-documents/:docId',
  requireRole('FLEET_MANAGER'),
  validate(docIdParamSchema),
  vehicleDocumentsController.deleteDocument
);

router.get(
  '/vehicle-documents/expiring',
  validate(queryExpiringDocsSchema),
  vehicleDocumentsController.getExpiringDocuments
);

module.exports = router;
