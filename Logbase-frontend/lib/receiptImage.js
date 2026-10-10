// Draws a receipt as a picture (PNG), in the same paper-receipt style as the receipt page,
// so it can be sent on WhatsApp or saved. Runs in the browser only (it uses a <canvas>).

import { formatMoney } from '@/lib/format';
import { describePhone } from '@/lib/phone';
import { receiptDateTime } from '@/lib/receipt';

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';
const W = 760; // picture width in CSS pixels (it is drawn at 2x for sharpness)
const MARGIN = 26; // grey space around the paper
const PAD = 52; // paper edge to text
const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#9ca3af';

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const out = [];
  let line = '';
  for (const word of words) {
    // a single word longer than the line (an IMEI list, say) is cut where it overflows
    let w = word;
    while (ctx.measureText(w).width > maxWidth) {
      let cut = w.length - 1;
      while (cut > 1 && ctx.measureText(w.slice(0, cut)).width > maxWidth) cut--;
      if (line) {
        out.push(line);
        line = '';
      }
      out.push(w.slice(0, cut));
      w = w.slice(cut);
    }
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxWidth) {
      out.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}

// Draws everything. With dry = true nothing is painted: it only measures, so the picture can be made the right height.
function paint(ctx, receipt, businessName, dry, height) {
  const left = MARGIN + PAD;
  const right = W - MARGIN - PAD;
  const inner = right - left;
  const mid = W / 2;
  let y = MARGIN + 54;

  const set = (size, weight = 400, color = INK, spacing = '0px') => {
    ctx.font = `${weight} ${size}px ${MONO}`;
    ctx.fillStyle = color;
    try {
      ctx.letterSpacing = spacing;
    } catch {
      // older browsers draw without the extra spacing
    }
  };
  const text = (value, x, align = 'left') => {
    if (dry) return;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  };
  const dashed = () => {
    y += 10;
    if (!dry) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    y += 30;
  };
  const row = (a, b, opts = {}) => {
    const { size = 22, weight = 400, color = INK, valueWeight = weight, valueColor = color } = opts;
    set(size, weight, color);
    text(a, left);
    set(size, valueWeight, valueColor);
    text(b, right, 'right');
    y += size + 12;
  };
  const centered = (value, size, weight, color, spacing = '0px', gap = 10) => {
    set(size, weight, color, spacing);
    for (const line of wrap(ctx, value, inner)) {
      text(line, mid, 'center');
      y += size + gap;
    }
  };

  // header
  centered(String(businessName || 'Receipt').toUpperCase(), 36, 800, INK, '1px', 8);
  y += 6;
  centered('SALES RECEIPT', 20, 600, MUTED, '5px', 8);
  dashed();

  // who, when
  const phone = describePhone(receipt.customerPhone).display;
  row('RECEIPT #', receipt.number, { valueWeight: 700 });
  row('DATE', receiptDateTime(receipt.date));
  if (receipt.servedBy) row('SERVED BY', String(receipt.servedBy).toUpperCase());
  row('CUSTOMER', String(receipt.customerName || 'Walk-in').toUpperCase());
  if (phone) row('PHONE', phone);
  if (receipt.paymentMethod) row('PAYMENT', String(receipt.paymentMethod).toUpperCase());
  dashed();

  // items
  set(18, 600, MUTED, '2px');
  text('ITEM', left);
  text('AMOUNT', right, 'right');
  y += 34;
  let count = 0;
  for (const item of receipt.items) {
    count += item.quantity;
    set(24, 700, INK);
    const nameLines = wrap(ctx, item.name.toUpperCase(), inner);
    for (const line of nameLines) {
      text(line, left);
      y += 32;
    }
    set(21, 400, MUTED);
    text(`${item.quantity} x ${formatMoney(item.unitPrice)}`, left);
    set(24, 700, INK);
    text(formatMoney(item.amount), right, 'right');
    y += 30;
    if (item.serials.length > 0) {
      set(17, 400, MUTED);
      for (const line of wrap(ctx, `IMEI / SERIAL: ${item.serials.join(', ')}`, inner)) {
        text(line, left);
        y += 24;
      }
    }
    if (item.warrantyEndsAt) {
      set(17, 400, MUTED);
      text(`WARRANTY UNTIL ${new Date(item.warrantyEndsAt).toLocaleDateString()}`, left);
      y += 24;
    }
    if (item.returnedQuantity > 0) {
      set(17, 400, MUTED);
      text(`RETURNED ${item.returnedQuantity}: -${formatMoney(item.returnedAmount)}`, left);
      y += 24;
    }
    y += 12;
  }
  dashed();

  // totals
  if (receipt.returned > 0) {
    row('SUBTOTAL', formatMoney(receipt.subtotal), { color: MUTED });
    row('RETURNED', `-${formatMoney(receipt.returned)}`, { color: MUTED });
  }
  row(`ITEMS SOLD`, String(count), { color: MUTED, size: 21 });
  y += 8;
  row('TOTAL', formatMoney(receipt.total), { size: 36, weight: 800 });
  y += 4;
  row('AMOUNT PAID', formatMoney(receipt.paid), { size: 24 });
  if (receipt.balance > 0) {
    y += 2;
    row('BALANCE DUE', formatMoney(receipt.balance), { size: 28, weight: 800, color: '#b91c1c' });
  } else if (receipt.total > 0) {
    y += 14;
    const label = 'PAID IN FULL';
    set(26, 800, '#15803d', '4px');
    const w = (dry ? 300 : ctx.measureText(label).width) + 56;
    if (!dry) {
      ctx.save();
      ctx.translate(mid, y + 22);
      ctx.rotate(-0.04);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-w / 2, -30, w, 60, 10) : ctx.rect(-w / 2, -30, w, 60);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 2, 2);
      ctx.restore();
    }
    y += 64;
  }
  dashed();

  // barcode (decorative, drawn from the receipt number)
  const code = String(receipt.number || '000000');
  const barTop = y;
  if (!dry) {
    ctx.fillStyle = INK;
    let x = left + 40;
    const end = right - 40;
    let i = 0;
    while (x < end) {
      const c = code.charCodeAt(i % code.length) + i * 7;
      const w = 2 + (c % 4);
      ctx.fillRect(x, barTop, w, 74);
      x += w + 2 + ((c >> 2) % 4);
      i++;
    }
  }
  y += 74 + 28;
  set(20, 600, MUTED, '6px');
  text(code, mid, 'center');
  y += 50;

  // thank you
  centered('THANK YOU FOR YOUR BUSINESS!', 23, 800, INK, '0px', 8);
  if (receipt.hasWarranty) {
    y += 4;
    centered('Keep this receipt. It is your proof of purchase for the warranty.', 18, 400, MUTED, '0px', 6);
  }
  y += 8;
  centered('Powered by LogBase  |  mylogbase.com', 17, 400, MUTED, '0px', 6);
  y += 36;
  return y + MARGIN;
}

function paper(ctx, height) {
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, W, height);
  const x0 = MARGIN;
  const x1 = W - MARGIN;
  const top = MARGIN;
  const bottom = height - MARGIN;
  const tooth = 12;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.18)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x0, top + tooth);
  for (let x = x0; x < x1; x += tooth * 2) {
    ctx.lineTo(x + tooth, top);
    ctx.lineTo(Math.min(x + tooth * 2, x1), top + tooth);
  }
  ctx.lineTo(x1, bottom - tooth);
  for (let x = x1; x > x0; x -= tooth * 2) {
    ctx.lineTo(x - tooth, bottom);
    ctx.lineTo(Math.max(x - tooth * 2, x0), bottom - tooth);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Resolves with a PNG Blob of the receipt.
export async function receiptToPng(receipt, businessName) {
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch {
    // fine: the picture just uses the fonts that are there
  }
  const scale = 2;
  const probe = document.createElement('canvas').getContext('2d');
  const height = Math.ceil(paint(probe, receipt, businessName, true, 0));
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  paper(ctx, height);
  ctx.textBaseline = 'alphabetic';
  paint(ctx, receipt, businessName, false, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make the picture'))), 'image/png');
  });
}
