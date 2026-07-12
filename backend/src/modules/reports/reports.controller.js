const asyncHandler = require('../../utils/asyncHandler');
const reportsService = require('./reports.service');

const getFuelEfficiency = asyncHandler(async (req, res) => {
  const data = await reportsService.getFuelEfficiency();
  res.status(200).json(data);
});

const getUtilization = asyncHandler(async (req, res) => {
  const data = await reportsService.getUtilization();
  res.status(200).json(data);
});

const getROI = asyncHandler(async (req, res) => {
  const data = await reportsService.getROI();
  res.status(200).json(data);
});

const exportCsv = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const csv = await reportsService.getExportData(type);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
  res.status(200).send(csv);
});

module.exports = {
  getFuelEfficiency,
  getUtilization,
  getROI,
  exportCsv,
};
