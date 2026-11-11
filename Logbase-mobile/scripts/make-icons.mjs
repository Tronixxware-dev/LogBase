// Draws the store icon and splash screen pictures from the LogBase logo (the same three teal layers as the website).
// Writes assets/icon-only.png, icon-foreground.png, icon-background.png, splash.png and splash-dark.png.
// You do NOT need to run this: the five pictures are already in the assets folder. Run it only to redraw them after changing the logo:
//   npm i --no-save playwright-core && npx playwright-core install chromium && npm run icons:redraw
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'assets');
mkdirSync(out, { recursive: true });

const LAYERS = `
  <g transform="translate(32 33) scale(1.15) translate(-32 -33)" stroke-width="2.5" stroke-linejoin="round">
    <path d="M32 33 51 42 32 51 13 42Z" fill="#0d9488" stroke="#0d9488" />
    <path d="M32 24 51 33 32 42 13 33Z" fill="#14b8a6" stroke="#14b8a6" />
    <path d="M32 15 51 24 32 33 13 24Z" fill="#2dd4bf" stroke="#2dd4bf" />
  </g>`;

// the logo mark is 38 units wide in a 64 unit box; viewBox "13 15 38 36" would crop it exactly.
const mark = (box) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="100%" height="100%">${LAYERS}</svg>`;

const pages = {
  // full icon: deep green tile with the mark filling about 60% (Apple draws its own rounded corners, so no rounding here)
  'icon-only.png': { size: 1024, html: `<div style="width:1024px;height:1024px;background:#134e4a;display:flex;align-items:center;justify-content:center"><div style="width:640px;height:640px">${mark('4 6 56 56')}</div></div>` },
  // Android adaptive icon: the mark alone on transparent (kept inside the centre safe zone), plus a plain background
  'icon-foreground.png': { size: 1024, transparent: true, html: `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center"><div style="width:560px;height:560px">${mark('4 6 56 56')}</div></div>` },
  'icon-background.png': { size: 1024, html: `<div style="width:1024px;height:1024px;background:#134e4a"></div>` },
  'splash.png': { size: 2732, html: `<div style="width:2732px;height:2732px;background:#134e4a;display:flex;align-items:center;justify-content:center"><div style="width:720px;height:720px">${mark('4 6 56 56')}</div></div>` },
  'splash-dark.png': { size: 2732, html: `<div style="width:2732px;height:2732px;background:#0b1f1e;display:flex;align-items:center;justify-content:center"><div style="width:720px;height:720px">${mark('4 6 56 56')}</div></div>` },
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, p] of Object.entries(pages)) {
  const page = await browser.newPage({ viewport: { width: p.size, height: p.size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${p.html}</body></html>`);
  await page.screenshot({ path: join(out, name), omitBackground: Boolean(p.transparent) });
  await page.close();
  console.log('wrote', name);
}
await browser.close();
