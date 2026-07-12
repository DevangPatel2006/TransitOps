const exportToCsv = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\r\n';
  }

  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      if (val === null || val === undefined) {
        return '';
      }
      const valStr = String(val).replace(/"/g, '""');
      if (valStr.includes(',') || valStr.includes('\n') || valStr.includes('\r') || valStr.includes('"')) {
        return `"${valStr}"`;
      }
      return valStr;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\r\n');
};

module.exports = {
  exportToCsv,
};

//checked csvExporter 