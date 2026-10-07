'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  importCustomers,
  importProducts,
  listCustomers,
  listExpenses,
  listProducts,
  listPurchases,
  listSales,
} from '@/lib/api';
import { downloadCsv, parseCsv, toCsv } from '@/lib/csv';
import {
  CUSTOMER_COLUMNS,
  EXPENSE_COLUMNS,
  PRODUCT_COLUMNS,
  PURCHASE_COLUMNS,
  SALE_COLUMNS,
  sinceDay,
  todayStamp,
} from '@/lib/exports';
import { KINDS, autoMap, buildRows, rowProblem, templateText } from '@/lib/importMap';
import { PERIODS, periodFromDay, periodQuery } from '@/lib/expenses';
import PageHeader from '@/components/PageHeader';
import { ErrorBanner, cardClass, inputClass, primaryButtonClass } from '@/components/ui';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;
const CHUNK = 100;

const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50';

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The file could not be read'));
    reader.readAsText(file);
  });
}

// ---------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------

const EXPORTS = [
  { key: 'products', label: 'Products and stock', note: 'Names, prices, cost prices and quantities', timed: false },
  { key: 'customers', label: 'Customers', note: 'Contacts and what each one owes', timed: false },
  { key: 'sales', label: 'Sales', note: 'Every sale line with payments and returns', timed: true },
  { key: 'purchases', label: 'Purchases', note: 'Stock bought, with suppliers and costs', timed: true },
  { key: 'expenses', label: 'Expenses', note: 'Rent, salaries and other running costs', timed: true },
];

function ExportSection() {
  const [period, setPeriod] = useState('all');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function run(item) {
    setError('');
    setMessage('');
    setBusy(item.key);
    try {
      const from = periodFromDay(period);
      let rows;
      let columns;
      let extra = '';
      if (item.key === 'products') {
        rows = (await listProducts()).products || [];
        columns = PRODUCT_COLUMNS;
      } else if (item.key === 'customers') {
        rows = (await listCustomers()).customers || [];
        columns = CUSTOMER_COLUMNS;
      } else if (item.key === 'sales') {
        rows = sinceDay((await listSales()).sales || [], from);
        columns = SALE_COLUMNS;
      } else if (item.key === 'purchases') {
        rows = sinceDay((await listPurchases()).purchases || [], from);
        columns = PURCHASE_COLUMNS;
      } else {
        const data = await listExpenses(periodQuery(period));
        rows = data.expenses || [];
        columns = EXPENSE_COLUMNS;
        if (data.truncated) extra = ' Only the newest 1,000 were included: pick a shorter period for the rest.';
      }
      if (rows.length === 0) {
        setMessage(`There is nothing to export for ${item.label.toLowerCase()}${item.timed && from ? ' in this period' : ''}.`);
      } else {
        downloadCsv(`logbase-${item.key}-${todayStamp()}.csv`, toCsv(columns, rows));
        setMessage(`Downloaded ${rows.length.toLocaleString()} ${rows.length === 1 ? 'row' : 'rows'} of ${item.label.toLowerCase()}.${extra}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Export</h2>
          <p className="text-sm text-gray-500">Download your records as a CSV file that opens in Excel or Google Sheets.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Sales, purchases and expenses for
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={`${inputClass} w-auto`} aria-label="Period for the export">
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorBanner message={error} />
      {message && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
          {message}
        </div>
      )}

      <ul className={`${cardClass} divide-y divide-gray-100`}>
        {EXPORTS.map((item) => (
          <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.note}</p>
            </div>
            <button type="button" onClick={() => run(item)} disabled={Boolean(busy)} className={secondaryButton} aria-label={`Download ${item.label}`}>
              {busy === item.key ? 'Preparing…' : 'Download CSV'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------------------------

function ImportSection() {
  const [kind, setKind] = useState('products');
  const [file, setFile] = useState(null); // { name, headers, records }
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('choose'); // choose | importing | done
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const input = useRef(null);

  const config = KINDS[kind];
  const fields = config.fields;

  const analysis = useMemo(() => {
    if (!file) return null;
    const rows = buildRows(file.records, mapping, fields);
    const good = [];
    const bad = [];
    for (const row of rows) {
      const problem = rowProblem(kind, row);
      if (problem) bad.push({ line: row.line, name: row.name, reason: problem });
      else good.push(row);
    }
    const missing = fields.filter((f) => f.required && !(mapping[f.key] >= 0));
    return { rows, good, bad, missing };
  }, [file, mapping, fields, kind]);

  function reset() {
    setFile(null);
    setMapping({});
    setError('');
    setPhase('choose');
    setResult(null);
    setProgress(0);
    if (input.current) input.current.value = '';
  }

  function switchKind(next) {
    if (phase === 'importing') return;
    reset();
    setKind(next);
  }

  async function chooseFile(e) {
    const picked = e.target.files && e.target.files[0];
    if (!picked) return;
    setError('');
    setResult(null);
    setPhase('choose');
    setFile(null);
    if (picked.size > MAX_FILE_BYTES) return setError('That file is too big (over 5 MB). Split it into smaller files.');
    try {
      const text = await readFileText(picked);
      if (text.startsWith('PK')) return setError('That is an Excel (.xlsx) file. Open it in Excel or Google Sheets and save it as CSV first (File, Save as, CSV).');
      const { rows } = parseCsv(text);
      if (rows.length === 0) return setError('That file is empty.');
      if (rows.length === 1) return setError('That file only has a header row and no data.');
      if (rows.length - 1 > MAX_ROWS) return setError(`That file has more than ${MAX_ROWS.toLocaleString()} rows. Split it into smaller files.`);
      const headers = rows[0].cells.map((c) => String(c).trim());
      setFile({ name: picked.name, headers, records: rows.slice(1) });
      setMapping(autoMap(headers, fields));
    } catch (err) {
      setError(err.message);
    }
  }

  async function startImport() {
    if (!analysis || analysis.good.length === 0 || analysis.missing.length > 0) return;
    setError('');
    setPhase('importing');
    setProgress(0);
    const send = kind === 'products' ? importProducts : importCustomers;
    let created = 0;
    const skipped = [...analysis.bad];
    let stopped = null;
    try {
      for (let i = 0; i < analysis.good.length; i += CHUNK) {
        const chunk = analysis.good.slice(i, i + CHUNK);
        const answer = await send(chunk);
        created += answer.created || 0;
        skipped.push(...(answer.skipped || []));
        setProgress(Math.min(analysis.good.length, i + chunk.length));
      }
    } catch (err) {
      stopped = err.message;
    }
    skipped.sort((a, b) => a.line - b.line);
    setResult({ created, skipped, stopped, kind });
    setPhase('done');
  }

  function downloadSkipped() {
    downloadCsv(
      `logbase-skipped-${kind}-${todayStamp()}.csv`,
      toCsv(
        [
          { label: 'Row in your file', get: (s) => s.line },
          { label: 'Name', get: (s) => s.name },
          { label: 'Why it was skipped', get: (s) => s.reason },
        ],
        result.skipped
      )
    );
  }

  const previewFields = fields.filter((f) => mapping[f.key] >= 0).slice(0, 5);

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Import</h2>
        <p className="text-sm text-gray-500">Add many products or customers at once from a CSV file, for example when you start using LogBase.</p>
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="What to import">
        {Object.entries(KINDS).map(([key, k]) => (
          <button
            key={key}
            type="button"
            onClick={() => switchKind(key)}
            aria-pressed={kind === key}
            className={`rounded-md px-3 py-1.5 text-sm transition ${kind === key ? 'bg-primary/10 font-medium text-primary' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      {phase === 'done' && result ? (
        <div className={`${cardClass} p-4 sm:p-5`} data-testid="import-result">
          <h3 className="text-base font-semibold text-gray-900">
            {result.created.toLocaleString()} {result.created === 1 ? config.noun : `${config.noun}s`} added
          </h3>
          {result.stopped && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              The import stopped part-way: {result.stopped} What was added before that is saved. Fix the problem and import the rest again. {kind === 'products' ? 'Products already added are skipped automatically.' : 'Check your customers list first so nobody is added twice.'}
            </p>
          )}
          {result.skipped.length > 0 ? (
            <>
              <p className="mt-2 text-sm text-gray-600">
                {result.skipped.length.toLocaleString()} {result.skipped.length === 1 ? 'row was' : 'rows were'} skipped:
              </p>
              <ul className="mt-2 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 text-sm">
                {result.skipped.slice(0, 50).map((s, i) => (
                  <li key={`${s.line}-${i}`} className="px-3 py-2">
                    <span className="font-medium text-gray-900">Row {s.line}</span>
                    {s.name ? <span className="text-gray-600">, {s.name}</span> : null}
                    <span className="block text-gray-500">{s.reason}</span>
                  </li>
                ))}
              </ul>
              {result.skipped.length > 50 && <p className="mt-1 text-xs text-gray-400">Showing the first 50. Download the list to see them all.</p>}
              <button type="button" onClick={downloadSkipped} className={`${secondaryButton} mt-3`}>
                Download the skipped rows
              </button>
            </>
          ) : (
            !result.stopped && <p className="mt-2 text-sm text-gray-600">Every row was imported.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={kind === 'products' ? '/dashboard/products' : '/dashboard/customers'} className={primaryButtonClass}>
              See your {config.label.toLowerCase()}
            </Link>
            <button type="button" onClick={reset} className={secondaryButton}>
              Import another file
            </button>
          </div>
        </div>
      ) : (
        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={chooseFile}
              disabled={phase === 'importing'}
              aria-label="Choose a CSV file"
              className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700"
            />
            <button type="button" onClick={() => downloadCsv(`logbase-${kind}-template.csv`, templateText(kind))} className={secondaryButton}>
              Download a template
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {kind === 'products'
              ? 'Needs a name and a selling price for each product. Products that already exist are skipped, so importing a file twice is safe.'
              : 'Needs a name for each customer. A phone number already saved is skipped. "Amount owed" becomes what the customer owes you today.'}
          </p>

          {file && analysis && (
            <div className="mt-5 border-t border-gray-100 pt-5">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{file.name}</span>: {analysis.rows.length.toLocaleString()} {analysis.rows.length === 1 ? 'row' : 'rows'} found
              </p>

              <h3 className="mb-2 mt-4 text-sm font-semibold text-gray-900">Match your columns</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.key} className="block text-sm text-gray-600">
                    {f.label}
                    {f.required ? ' *' : ''}
                    <select
                      value={mapping[f.key] ?? -1}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: Number(e.target.value) }))}
                      className={`${inputClass} mt-1`}
                      aria-label={`Column for ${f.label}`}
                    >
                      <option value={-1}>Not in my file</option>
                      {file.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `(column ${i + 1})`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              {analysis.missing.length > 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Choose a column for: {analysis.missing.map((f) => f.label).join(', ')}.
                </p>
              )}

              {previewFields.length > 0 && analysis.rows.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        {previewFields.map((f) => (
                          <th key={f.key} className="px-3 py-2">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {analysis.rows.slice(0, 5).map((row) => (
                        <tr key={row.line}>
                          <td className="px-3 py-2 text-gray-400">{row.line}</td>
                          {previewFields.map((f) => (
                            <td key={f.key} className="max-w-[12rem] truncate px-3 py-2 text-gray-800">
                              {row[f.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-3 text-sm text-gray-700" data-testid="import-summary">
                {analysis.good.length.toLocaleString()} {analysis.good.length === 1 ? 'row' : 'rows'} ready
                {analysis.bad.length > 0 ? `, ${analysis.bad.length.toLocaleString()} with problems (they will be skipped)` : ''}.
              </p>
              {analysis.bad.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
                  {analysis.bad.slice(0, 5).map((b) => (
                    <li key={b.line}>
                      Row {b.line}: {b.reason}
                    </li>
                  ))}
                  {analysis.bad.length > 5 && <li>and {analysis.bad.length - 5} more</li>}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={startImport}
                  disabled={phase === 'importing' || analysis.good.length === 0 || analysis.missing.length > 0}
                  className={primaryButtonClass}
                >
                  {phase === 'importing'
                    ? `Importing ${progress.toLocaleString()} of ${analysis.good.length.toLocaleString()}…`
                    : `Import ${analysis.good.length.toLocaleString()} ${analysis.good.length === 1 ? config.noun : `${config.noun}s`}`}
                </button>
                {phase !== 'importing' && (
                  <button type="button" onClick={reset} className={secondaryButton}>
                    Start over
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Download your records, or bring them in from a spreadsheet. Administrator only.
export default function DataPage() {
  return (
    <>
      <PageHeader title="Import & export" subtitle="Move your records in and out of LogBase with spreadsheet (CSV) files. Only you can see this page." />
      <ExportSection />
      <ImportSection />
    </>
  );
}
