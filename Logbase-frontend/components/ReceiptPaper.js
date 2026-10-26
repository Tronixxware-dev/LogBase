'use client';

// The one receipt paper used everywhere in LogBase (sales receipts, laundry and repair slips, statements):
// a narrow till roll in the style of a supermarket or chemist receipt. What goes on it is described by a "doc"
// from lib/receiptDoc.js; the business details come from Settings > Organization. Styles: .lbr in app/globals.css.

import { closingOf, identityLines } from '@/lib/settings';

// A decorative barcode drawn from the number.
export function Barcode({ code }) {
  const bars = [];
  let x = 0;
  const text = String(code || '000000');
  for (let i = 0; x < 300; i++) {
    const c = text.charCodeAt(i % text.length) + i * 7;
    const w = 2 + (c % 4);
    bars.push(<rect key={i} x={x} y="0" width={w} height="64" fill="#111" />);
    x += w + 2 + ((c >> 2) % 4);
  }
  return (
    <svg viewBox={`0 0 ${x} 64`} preserveAspectRatio="none" className="lbr-barcode" aria-hidden="true">
      {bars}
    </svg>
  );
}

function Block({ block }) {
  switch (block.t) {
    case 'rule':
      return <hr className={`lbr-rule${block.solid ? ' lbr-solid' : ''}`} />;
    case 'info':
      return (
        <div className="lbr-info">
          {block.rows.map(([label, value]) => (
            <div key={label} className="lbr-spread lbr-keep">
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      );
    case 'items':
      return (
        <ul className="lbr-items">
          {block.items.map((item, i) => (
            <li key={i} className="lbr-item">
              <div className="lbr-spread lbr-fill">
                <span className="lbr-bold">{item.name}</span>
                <span className="lbr-bold">{item.amount}</span>
              </div>
              {item.sub && <p className="lbr-sub">{item.sub}</p>}
              {(item.notes || []).map((n, j) => (
                <p key={j} className="lbr-note">
                  {n}
                </p>
              ))}
            </li>
          ))}
        </ul>
      );
    case 'totals':
      return (
        <div className="lbr-totals">
          {block.rows.map((row, i) => (
            <div key={i} className={`lbr-spread lbr-fill${row.tone ? ` lbr-${row.tone}` : ''}`}>
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      );
    case 'text':
      return (
        <div className={`lbr-text${block.align === 'left' ? '' : ' lbr-c'}${block.tone === 'muted' ? ' lbr-muted' : ''}${block.bold ? ' lbr-bold' : ''}${block.upper ? ' lbr-upper' : ''}${block.tight ? ' lbr-tight' : ''}`}>
          {block.lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      );
    case 'stamp':
      return (
        <div className="lbr-stamp-wrap">
          <span className="lbr-stamp">{block.text}</span>
        </div>
      );
    case 'barcode':
      return (
        <div className="lbr-c lbr-code">
          <Barcode code={block.code} />
          <p>
            {block.label ? `${block.label} ` : ''}
            {block.code}
          </p>
        </div>
      );
    default:
      return null;
  }
}

export default function ReceiptPaper({ doc, org, name }) {
  const o = org || {};
  const r = o.receipt || {};
  const showLogo = o.logoUrl && r.showLogo !== false;
  return (
    <article data-receipt className="lbr">
      <header className="lbr-c">
        {showLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={o.logoUrl} alt="" className="lbr-logo" />
        )}
        <h1 className="lbr-name">{name || o.name}</h1>
        {identityLines(o).map((line) => (
          <p key={line} className="lbr-id">
            {line}
          </p>
        ))}
        {doc.title && <p className="lbr-title">{doc.title}</p>}
      </header>

      <hr className="lbr-rule" />

      {doc.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}

      <footer className="lbr-c lbr-foot">
        <p className="lbr-closing">{closingOf(o)}</p>
        {r.footer && <p className="lbr-footer">{r.footer}</p>}
        <p className="lbr-powered">Powered by LogBase | mylogbase.com</p>
      </footer>
    </article>
  );
}
