const asyncHandler = require('../../utils/asyncHandler');
const reportsPdfService = require('./reports.pdf.service');
const { generateTablePDF } = require('../../utils/pdfExporter');

const exportPdf = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const { formatted, headers, title } = await reportsPdfService.getPdfReportData(type);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.pdf"`);

  generateTablePDF(title, headers, formatted, res);
});

module.exports = {
  exportPdf,
};
