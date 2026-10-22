'use client';

import { cardClass } from '@/components/ui';
import { Icon } from '@/components/Icons';

// Responsive list: a normal table on tablets/desktops, stacked cards on phones.
//
// columns: [{ key, label, render?(row), align? ('right') }]
//   - the FIRST column is used as the card title on mobile
// rows:    array of objects (each needs a unique `_id`)
// onRowClick(row): optional, makes rows clickable
// Every row is numbered (1, 2, 3 …) in a first "#" column. Pass numbered={false} to turn that off.
export default function DataTable({ columns, rows, onRowClick, numbered = true }) {
  const [primary, ...rest] = columns;

  function cell(col, row) {
    if (col.render) return col.render(row);
    const value = row[col.key];
    return value === undefined || value === null || value === '' ? '—' : value;
  }

  const clickable = onRowClick ? 'cursor-pointer' : '';

  return (
    <>
      {/* Phones: one clear card per item, with a coloured edge */}
      <div className="stagger space-y-3 sm:hidden">
        {rows.map((row, index) => (
          <div
            key={row._id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`${cardClass} overflow-hidden border-l-4 border-l-primary !border-gray-300 p-4 transition active:scale-[0.99] ${clickable}`}
          >
            <div className="flex items-start justify-between gap-2 text-base font-bold text-gray-900">
              <span className="min-w-0">
                {numbered && (
                  <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 px-1.5 align-middle text-xs font-bold text-gray-600">
                    {index + 1}
                  </span>
                )}
                {cell(primary, row)}
              </span>
              {onRowClick && <Icon name="chevronRight" className="mt-1 h-4 w-4 shrink-0 text-gray-400" />}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-200 pt-3 text-sm">
              {rest.map((col) => (
                <div key={col.key}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{col.label}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{cell(col, row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Tablets and up: a table with a solid header, banded rows and a bold first column */}
      <div className={`${cardClass} hidden overflow-hidden !border-gray-300 sm:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-gray-300 bg-gray-100 text-left">
              <tr>
                {numbered && <th className="w-14 px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-700">#</th>}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-700 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.label}
                  </th>
                ))}
                {onRowClick && <th className="w-8 px-2" aria-hidden="true" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row, index) => (
                <tr
                  key={row._id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`even:bg-gray-100 ${clickable}`}
                >
                  {numbered && (
                    <td className="tabular px-4 py-4">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-200 px-1.5 text-xs font-bold text-gray-700">
                        {index + 1}
                      </span>
                    </td>
                  )}
                  {columns.map((col, ci) => (
                    <td
                      key={col.key}
                      className={`tabular px-4 py-4 align-middle ${ci === 0 ? 'text-[15px] font-bold text-gray-900' : col.align === 'right' ? 'font-bold text-gray-900' : 'font-medium text-gray-800'} ${
                        col.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {cell(col, row)}
                    </td>
                  ))}
                  {onRowClick && (
                    <td className="px-2">
                      <Icon
                        name="chevronRight"
                        className="h-4 w-4 text-gray-400"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
