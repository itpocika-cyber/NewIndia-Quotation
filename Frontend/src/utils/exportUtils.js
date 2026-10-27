/**
 * Client-Side Data Export & Import Utilities
 * Generates RFC-4180 compliant CSVs with UTF-8 BOM for Microsoft Excel compatibility.
 */

/**
 * Converts an array of objects to CSV format and triggers browser download.
 * 
 * @param {string} filename - e.g. "quotations_report.csv"
 * @param {Array<Object>} rows - Data rows
 * @param {Array<{ key: string, label: string, formatter?: Function }>} columns - Column definitions
 */
export function exportToCSV(filename, rows, columns) {
  if (!rows || rows.length === 0) {
    throw new Error('No data available to export');
  }

  // Helper to escape CSV cells
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Header row
  const headerLine = columns.map((col) => escapeCell(col.label)).join(',');

  // Data rows
  const dataLines = rows.map((row) => {
    return columns
      .map((col) => {
        let val;
        if (col.formatter) {
          val = col.formatter(row[col.key], row);
        } else if (col.key.includes('.')) {
          // Handle nested keys e.g. "customer.name"
          val = col.key.split('.').reduce((obj, k) => (obj ? obj[k] : ''), row);
        } else {
          val = row[col.key];
        }
        return escapeCell(val);
      })
      .join(',');
  });

  // Combine with UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports complete application state as a structured JSON backup file.
 * 
 * @param {string} filename - e.g. "pocika_backup_2026-08-30.json"
 * @param {Object} backupData - Complete system state payload
 */
export function exportToJSON(filename, backupData) {
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates the structure and integrity of an imported JSON backup file.
 * 
 * @param {Object} parsedJson 
 * @returns {{ valid: boolean, counts: Object, error?: string }}
 */
export function validateBackupData(parsedJson) {
  if (!parsedJson || typeof parsedJson !== 'object') {
    return { valid: false, error: 'Invalid file: Root content must be a valid JSON object.' };
  }

  const counts = {
    company: Boolean(parsedJson.company),
    customers: Array.isArray(parsedJson.customers) ? parsedJson.customers.length : 0,
    products: Array.isArray(parsedJson.products) ? parsedJson.products.length : 0,
    categories: Array.isArray(parsedJson.categories) ? parsedJson.categories.length : 0,
    units: Array.isArray(parsedJson.units) ? parsedJson.units.length : 0,
    taxes: Array.isArray(parsedJson.taxes) ? parsedJson.taxes.length : 0,
    paymentTerms: Array.isArray(parsedJson.paymentTerms) ? parsedJson.paymentTerms.length : 0,
    termsConditions: Array.isArray(parsedJson.termsConditions) ? parsedJson.termsConditions.length : 0,
    quotations: Array.isArray(parsedJson.quotations) ? parsedJson.quotations.length : 0,
    settings: Boolean(parsedJson.settings)
  };

  const hasAnyData =
    counts.customers > 0 ||
    counts.products > 0 ||
    counts.quotations > 0 ||
    counts.company;

  if (!hasAnyData) {
    return { valid: false, error: 'Backup file contains no recognizable system records or tables.' };
  }

  return { valid: true, counts };
}
