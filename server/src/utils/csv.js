'use strict';

/**
 * Escapes a single CSV cell value according to RFC 4180.
 * Wraps value in double quotes if it contains commas, double quotes, or newlines.
 * Escapes internal double quotes by doubling them ("").
 *
 * @param {*} value - The value to format as a CSV cell.
 * @returns {string} - Escaped cell string.
 */
function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes an array of cell values into an RFC 4180-compliant CSV row string.
 * All cells in the row are processed via escapeCsvCell().
 *
 * @param {Array<*>} cells - Array of values for the row.
 * @returns {string} - Comma-separated row string.
 */
function toCsvRow(cells = []) {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * Sanitizes a title string into a kebab-cased, alphanumeric, filename-safe string.
 * e.g., 'Morning Yoga' -> 'morning-yoga', 'HIIT: Beginners!' -> 'hiit-beginners'.
 *
 * @param {string} name - The string to sanitize.
 * @returns {string} - Filename-safe sanitized string.
 */
function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') {
    return 'session';
  }
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'session';
}

/**
 * Robust RFC 4180 CSV parser for testing and structural validation.
 * Correctly parses quoted fields, escaped quotes (""), commas, and multi-line strings.
 *
 * @param {string} csvText - Raw CSV text to parse.
 * @returns {Array<Array<string>>} - Parsed 2D array of rows and cell values.
 */
function parseCsvRows(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return [];
  }

  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped double quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // Skip \n in \r\n
        }
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

module.exports = {
  escapeCsvCell,
  toCsvRow,
  sanitizeFilename,
  parseCsvRows,
};
