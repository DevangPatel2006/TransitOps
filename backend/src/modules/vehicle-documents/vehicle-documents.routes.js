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

// Configure multer storage
const uploadDir = path.join(__dirname, '../../../uploads/vehicle-docs');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
