const PDFDocument = require('pdfkit');

const generateTablePDF = (title, headers, data, res) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  // Stream PDF to response
  doc.pipe(res);

  // Document Title & Date
  doc.font('Helvetica-Bold').fontSize(20).text(title, { align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Layout parameters
  const startX = 30;
  const tableWidth = 535; // A4 width is 595, margins are 30+30=60, so width is 535
  const colWidth = tableWidth / headers.length;
  let currentY = doc.y;

  // Header row background
  doc.fillColor('#eaeaea')
    .rect(startX, currentY - 5, tableWidth, 20)
    .fill();

  // Header texts
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
  headers.forEach((header, i) => {
    doc.text(header, startX + i * colWidth + 5, currentY, { width: colWidth - 10, align: 'left' });
  });

  doc.moveTo(startX, currentY + 15).lineTo(startX + tableWidth, currentY + 15).strokeColor('#cccccc').stroke();
  currentY += 20;

  // Draw rows
  doc.font('Helvetica').fontSize(8);
  data.forEach((row, rowIndex) => {
    // If Y goes too low, add page and reprint header
    if (currentY > 780) {
      doc.addPage();
      currentY = 40;

      // Header row background on new page
      doc.fillColor('#eaeaea')
        .rect(startX, currentY - 5, tableWidth, 20)
        .fill();

      // Header texts
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
      headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidth + 5, currentY, { width: colWidth - 10, align: 'left' });
      });

      doc.moveTo(startX, currentY + 15).lineTo(startX + tableWidth, currentY + 15).strokeColor('#cccccc').stroke();
      currentY += 20;
      doc.font('Helvetica').fontSize(8);
    }

    // Zebra striping
    if (rowIndex % 2 === 1) {
      doc.fillColor('#f9f9f9')
        .rect(startX, currentY - 3, tableWidth, 14)
        .fill();
    }

    doc.fillColor('#333333');
    headers.forEach((header, i) => {
      const val = row[header];
      const valStr = val !== null && val !== undefined ? String(val) : '';
      doc.text(valStr, startX + i * colWidth + 5, currentY, { width: colWidth - 10, align: 'left' });
    });

    currentY += 14;
  });

  doc.end();
};

module.exports = {
  generateTablePDF,
};

//checked pdfExporter
