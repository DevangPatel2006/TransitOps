const express = require('express');
const { z } = require('zod');
const validate = require('../../utils/validators');
const reportsPdfController = require('./reports.pdf.controller');
const authenticate = require('../../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

const pdfExportQuerySchema = z.object({
  query: z.object({
    type: z.enum(['vehicles', 'drivers', 'trips', 'costs', 'roi']),
  }),
});

router.get('/', validate(pdfExportQuerySchema), reportsPdfController.exportPdf);

module.exports = router;
