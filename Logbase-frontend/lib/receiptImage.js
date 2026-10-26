// Draws a receipt as a picture (PNG), in the same till-roll style as the receipt page (components/ReceiptPaper.js),
// so it can be sent on WhatsApp or saved. Takes a doc from lib/receiptDoc.js. Runs in the browser only (it uses a <canvas>).

import { closingOf, identityLines } from '@/lib/settings';

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';
const W = 560; // picture width in CSS pixels (it is drawn at 2x for sharpness)
const MARGIN = 24; // grey space around the paper
const PAD = 34; // paper edge to text
const INK = '#111111';
const MUTED = '#555555';
const LINE = '#8a8a8a';
const RED = '#b91c1c';
const GREEN = '#15803d';
const BODY = 17; // text size of the body, in px

function wrap(ctx, text, maxWidth) {
  const out = [];
  for (const paragraph of String(text ?? '').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
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
    out.push(line);
  }
  return out;
}

// Draws everything. With dry = true nothing is painted: it only measures, so the picture can be made the right height.
function paint(ctx, doc, businessName, dry, extra) {
  const left = MARGIN + PAD;
  const right = W - MARGIN - PAD;
  const inner = right - left;
  const mid = W / 2;
  let y = MARGIN + 50;

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
  const rule = (solid) => {
    y += 4;
    if (!dry) {
      ctx.strokeStyle = solid ? INK : LINE;
      ctx.lineWidth = solid ? 2 : 1.5;
      ctx.setLineDash(solid ? [] : [8, 6]);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    y += 22;
  };
  const centered = (value, size, weight, color, spacing = '0px', gap = 6) => {
    set(size, weight, color, spacing);
    for (const line of wrap(ctx, value, inner)) {
      y += size;
      text(line, mid, 'center');
      y += gap;
    }
  };
  // label on the left, value on the right; `fill` lets the label take the room (items, totals), otherwise the value wraps
  const spread = (label, value, { size = BODY, weight = 400, color = INK, labelColor = color, fill = false } = {}) => {
    const lab = String(label).toUpperCase();
    const val = String(value ?? '').toUpperCase();
    set(size, weight, color);
    const gap = 14;
    let labelLines;
    let valueLines;
    if (fill) {
      const vw = val ? ctx.measureText(val).width : 0;
      labelLines = wrap(ctx, lab, inner - vw - (val ? gap : 0));
      valueLines = [val];
    } else {
      const lw = ctx.measureText(lab).width;
      labelLines = [lab];
      valueLines = wrap(ctx, val, inner - lw - gap);
    }
    const n = Math.max(labelLines.length, valueLines.length);
    for (let i = 0; i < n; i++) {
      y += size;
      if (labelLines[i] !== undefined) {
        set(size, weight, labelColor);
        text(labelLines[i], left);
      }
      if (valueLines[i]) {
        set(size, weight, color);
        text(valueLines[i], right, 'right');
      }
      y += 5;
    }
  };

  // header: the logo (when there is one), the name, the address / phone lines and what kind of paper this is
  if (extra.logo) {
    const k = Math.min(300 / extra.logo.width, 90 / extra.logo.height, 1);
    const w = extra.logo.width * k;
    const h = extra.logo.height * k;
    if (!dry) ctx.drawImage(extra.logo, mid - w / 2, y - 10, w, h);
    y += h + 8;
  }
  centered(String(businessName || 'Receipt').toUpperCase(), 28, 800, INK, '1px', 6);
  for (const line of extra.lines || []) centered(line, 15, 400, MUTED, '0px', 3);
  y += 6;
  if (doc.title) centered(String(doc.title).toUpperCase(), 16, 700, INK, '4px', 4);
  y += 4;
  rule();

  for (const block of doc.blocks) {
    if (block.t === 'rule') {
      rule(block.solid);
    } else if (block.t === 'info') {
      for (const [label, value] of block.rows) spread(label, value, { labelColor: MUTED, color: INK });
      y += 2;
    } else if (block.t === 'items') {
      block.items.forEach((item, idx) => {
        if (idx > 0) y += 8;
        spread(item.name, item.amount, { weight: 700, fill: true });
        if (item.sub) {
          set(BODY - 1, 400, MUTED);
          for (const line of wrap(ctx, item.sub.toUpperCase(), inner - 24)) {
            y += BODY - 1;
            text(line, left + 24);
            y += 4;
          }
        }
        for (const note of item.notes || []) {
          set(BODY - 2, 400, MUTED);
          for (const line of wrap(ctx, note.toUpperCase(), inner - 24)) {
            y += BODY - 2;
            text(line, left + 24);
            y += 4;
          }
        }
      });
      y += 2;
    } else if (block.t === 'totals') {
      for (const row of block.rows) {
        if (row.tone === 'big') {
          y += 4;
          spread(row.label, row.value, { size: 26, weight: 800, fill: true });
          y += 2;
        } else if (row.tone === 'danger') {
          spread(row.label, row.value, { weight: 800, color: RED, fill: true });
        } else if (row.tone === 'strong') {
          spread(row.label, row.value, { weight: 800, fill: true });
        } else if (row.tone === 'muted') {
          spread(row.label, row.value, { color: MUTED, fill: true });
        } else {
          spread(row.label, row.value, { fill: true });
        }
      }
      y += 2;
    } else if (block.t === 'text') {
      y += 8;
      const size = block.tone === 'muted' ? BODY - 2 : BODY;
      const center = block.align !== 'left';
      set(size, block.bold ? 700 : 400, block.tone === 'muted' ? MUTED : INK);
      for (const raw of block.lines) {
        for (const line of wrap(ctx, block.upper ? String(raw).toUpperCase() : raw, inner)) {
          y += size;
          text(line, center ? mid : left, center ? 'center' : 'left');
          y += 4;
        }
      }
      if (block.tight) y -= 6;
    } else if (block.t === 'stamp') {
      y += 14;
      const label = String(block.text).toUpperCase();
      set(22, 800, GREEN, '4px');
      const w = (dry ? 260 : ctx.measureText(label).width) + 44;
      if (!dry) {
        ctx.save();
        ctx.translate(mid, y + 20);
        ctx.rotate(-0.035);
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-w / 2, -26, w, 52, 9);
        else ctx.rect(-w / 2, -26, w, 52);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 2, 2);
        ctx.restore();
        ctx.textBaseline = 'alphabetic';
      }
      y += 52 + 10;
    } else if (block.t === 'barcode') {
      y += 6;
      const code = String(block.code || '000000');
      if (!dry) {
        ctx.fillStyle = INK;
        let x = left + 30;
        const end = right - 30;
        let i = 0;
        while (x < end) {
          const c = code.charCodeAt(i % code.length) + i * 7;
          const w = 2 + (c % 4);
          ctx.fillRect(x, y, Math.min(w, end - x), 62);
          x += w + 2 + ((c >> 2) % 4);
          i++;
        }
      }
      y += 62 + 8;
      set(BODY - 4, 400, '#333333', '4px');
      y += BODY - 4;
      text(`${block.label ? `${block.label} ` : ''}${code}`, mid, 'center');
      y += 8;
    }
  }

  // thank you, the footer message, powered by
  y += 12;
  centered(extra.closing.toUpperCase(), 17, 800, INK, '0px', 5);
  if (extra.footer) {
    y += 4;
    centered(extra.footer, 15, 400, MUTED, '0px', 4);
  }
  y += 10;
  centered('POWERED BY LOGBASE  |  MYLOGBASE.COM', 13, 400, '#777777', '1px', 4);
  y += 30;
  return y + MARGIN;
}

function paper(ctx, height) {
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(0, 0, W, height);
  const x0 = MARGIN;
  const x1 = W - MARGIN;
  const top = MARGIN;
  const bottom = height - MARGIN;
  const tooth = 10;
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

// The logo as a picture the canvas may draw (null when there is none, or it cannot be loaded: the receipt is made without it)
function loadLogo(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.width > 0 && img.height > 0 ? img : null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

// Resolves with a PNG Blob of the receipt. `doc` is from lib/receiptDoc.js; `org` is the business identity from Settings
// (logo, address, phone, message).
export async function receiptToPng(doc, businessName, org) {
  const choices = (org && org.receipt) || {};
  const extra = {
    logo: org && org.logoUrl && choices.showLogo !== false ? await loadLogo(org.logoUrl) : null,
    lines: identityLines(org),
    footer: choices.footer || '',
    closing: closingOf(org),
  };
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch {
    // fine: the picture just uses the fonts that are there
  }
  const scale = 2;
  const probe = document.createElement('canvas').getContext('2d');
  const height = Math.ceil(paint(probe, doc, businessName, true, extra));
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  paper(ctx, height);
  ctx.textBaseline = 'alphabetic';
  paint(ctx, doc, businessName, false, extra);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make the picture'))), 'image/png');
  });
}
