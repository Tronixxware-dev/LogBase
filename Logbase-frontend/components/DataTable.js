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
      {/* Phones: cards */}
      <div className="stagger space-y-3 sm:hidden">
        {rows.map((row, index) => (
          <div
            key={row._id}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`${cardClass} p-4 transition active:scale-[0.99] ${clickable}`}
          >
            <div className="flex items-start justify-between gap-2 font-medium text-gray-900">
              <span className="min-w-0">
                {numbered && <span className="mr-2 text-xs font-normal text-gray-400">#{index + 1}</span>}
                {cell(primary, row)}
              </span>
              {onRowClick && <Icon name="chevronRight" className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {rest.map((col) => (
                <div key={col.key}>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{col.label}</dt>
                  <dd className="mt-0.5 text-gray-700">{cell(col, row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Tablets and up: table */}
      <div className={`${cardClass} hidden overflow-hidden sm:block`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-left">
              <tr>
                {numbered && (
                  <th className="w-12 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">#</th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${
                      col.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
                {onRowClick && <th className="w-8 px-2" aria-hidden="true" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr
                  key={row._id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`group transition-colors hover:bg-primary/[0.04] ${clickable}`}
                >
                  {numbered && <td className="tabular px-4 py-3.5 text-gray-400">{index + 1}</td>}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`tabular px-4 py-3.5 text-gray-700 ${col.align === 'right' ? 'text-right' : ''}`}
                    >
                      {cell(col, row)}
                    </td>
                  ))}
                  {onRowClick && (
                    <td className="px-2">
                      <Icon
                        name="chevronRight"
                        className="h-4 w-4 -translate-x-1 text-gray-300 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
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
