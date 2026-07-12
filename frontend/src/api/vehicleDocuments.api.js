import axiosClient from './axiosClient';

/**
 * Get all documents for a specific vehicle.
 * @param {number} vehicleId - The ID of the vehicle.
 */
export function getVehicleDocuments(vehicleId) {
  return axiosClient.get(`/vehicles/${vehicleId}/documents`);
}

/**
 * Upload a document for a specific vehicle.
 * @param {number} vehicleId - The ID of the vehicle.
 * @param {FormData} formData - FormData containing doc_type, issue_date, expiry_date, and document.
 */
export function uploadVehicleDocument(vehicleId, formData) {
  return axiosClient.post(`/vehicles/${vehicleId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Download a document file.
 * @param {number} docId - The ID of the document.
 */
export function downloadVehicleDocument(docId) {
  // Use responseType 'blob' so the browser can download/save the file
  return axiosClient.get(`/vehicle-documents/${docId}/download`, {
    responseType: 'blob',
  });
}

/**
 * Delete a vehicle document.
 * @param {number} docId - The ID of the document.
 */
export function deleteVehicleDocument(docId) {
  return axiosClient.delete(`/vehicle-documents/${docId}`);
}
