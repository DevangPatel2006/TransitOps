const path = require('path');
const fs = require('fs');
const asyncHandler = require('../../utils/asyncHandler');
const vehicleDocumentsService = require('./vehicle-documents.service');
const ApiError = require('../../utils/ApiError');

const uploadDocument = asyncHandler(async (req, res) => {
  const vehicleId = Number(req.params.id);
  const doc = await vehicleDocumentsService.uploadDocument(vehicleId, req.file, req.body);
  res.status(201).json(doc);
});

const getDocumentsForVehicle = asyncHandler(async (req, res) => {
  const vehicleId = Number(req.params.id);
  const list = await vehicleDocumentsService.getDocumentsForVehicle(vehicleId);
  res.status(200).json(list);
});

const downloadDocument = asyncHandler(async (req, res) => {
  const docId = Number(req.params.docId);
  const doc = await vehicleDocumentsService.getDocumentById(docId);

  if (!fs.existsSync(doc.file_path)) {
    throw new ApiError(404, 'Physical file not found on disk');
  }

  res.download(doc.file_path, doc.file_name);
});

const deleteDocument = asyncHandler(async (req, res) => {
  const docId = Number(req.params.docId);
  const result = await vehicleDocumentsService.deleteDocument(docId);
  res.status(200).json(result);
});

const getExpiringDocuments = asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 30;
  const list = await vehicleDocumentsService.getExpiringDocuments(days);
  res.status(200).json(list);
});

module.exports = {
  uploadDocument,
  getDocumentsForVehicle,
  downloadDocument,
  deleteDocument,
  getExpiringDocuments,
};
