const fs = require('fs');
const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const uploadDocument = async (vehicleId, file, body) => {
  const { doc_type, issue_date, expiry_date } = body;

  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: vehicleId },
  });
  if (!vehicle) {
    // Cleanup uploaded file on error
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new ApiError(404, 'Vehicle not found');
  }

  if (!file) {
    throw new ApiError(400, 'No document file uploaded');
  }

  return await prisma.vehicleDocument.create({
    data: {
      vehicle_id: vehicleId,
      doc_type,
      file_name: file.originalname,
      file_path: file.path,
      issue_date,
      expiry_date,
    },
  });
};

const getDocumentsForVehicle = async (vehicleId) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: vehicleId },
  });
  if (!vehicle) {
    throw new ApiError(404, 'Vehicle not found');
  }

  return await prisma.vehicleDocument.findMany({
    where: { vehicle_id: vehicleId },
  });
};

const getDocumentById = async (docId) => {
  const doc = await prisma.vehicleDocument.findUnique({
    where: { document_id: docId },
    include: { vehicle: true },
  });
  if (!doc) {
    throw new ApiError(404, 'Vehicle document not found');
  }
  return doc;
};

const deleteDocument = async (docId) => {
  const doc = await getDocumentById(docId);

  await prisma.vehicleDocument.delete({
    where: { document_id: docId },
  });

  // Delete physical file
  try {
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }
  } catch (err) {
    console.error(`Failed to delete file on disk at ${doc.file_path}:`, err.message);
  }

  return { message: 'Document deleted successfully' };
};

const getExpiringDocuments = async (days = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + days);
  targetDate.setHours(23, 59, 59, 999);

  return await prisma.vehicleDocument.findMany({
    where: {
      expiry_date: {
        gte: today,
        lte: targetDate,
      },
    },
    include: {
      vehicle: true,
    },
  });
};

module.exports = {
  uploadDocument,
  getDocumentsForVehicle,
  getDocumentById,
  deleteDocument,
  getExpiringDocuments,
};
