// Reading and writing CSV files (what Excel and Google Sheets open and save). No libraries, no React.

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_SIGNED_NUMBER = /^[+-]\d[\d.,\s]*$/;

// A cell that starts with = + - or @ can run as a formula when the file is opened in Excel, so it is
// made harmless by a leading apostrophe. Ordinary signed numbers (+2348031234567, -500) are left alone.
export function safeCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const text = String(value);
  if (FORMULA_START.test(text) && !PLAIN_SIGNED_NUMBER.test(text)) return `'${text}`;
  return text;
}

function quote(text) {
  return /[",\r\n]/.test(text) || /^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// columns: [{ label, get: (row) => value }]. Returns the file text, with a byte-order mark so Excel reads accents and ₦ correctly.
export function toCsv(columns, rows) {
  const lines = [columns.map((c) => quote(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => quote(safeCell(c.get(row)))).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

// Starts a download of `text` as a file in the browser.
export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The separator Excel uses depends on the country (comma, semicolon or tab): take the one the first line uses most.
function detectDelimiter(text) {
  let inQuotes = false;
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    else if (!inQuotes && ch in counts) counts[ch] += 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ',';
}

// Reads CSV text into { rows: [{ line, cells: [...] }], delimiter }. `line` is the record number in the file
// (the header is 1), so a problem can be reported as "row 7". Records with nothing in them are skipped.
export function parseCsv(input) {
  let text = String(input || '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = detectDelimiter(text);

  const rows = [];
  let cells = [];
  let cell = '';
  let inQuotes = false;
  let record = 1;

  const endCell = () => {
    cells.push(cell);
    cell = '';
  };
  const endRecord = () => {
    endCell();
    // a record with nothing in any cell (a blank line, or ",,," that Excel leaves at the end) is not a row
    if (cells.some((c) => c !== '')) rows.push({ line: record, cells });
    cells = [];
    record += 1;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      endCell();
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      endRecord();
    } else cell += ch;
  }
  if (cell !== '' || cells.length > 0) endRecord();

  return { rows, delimiter };
}
