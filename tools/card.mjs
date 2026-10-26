// Render the receipt-style share card (1080x1350) from a sweep receipt.
// Usage: node tools/card.mjs receipts/2026-10-26.json [--repo github.com/you/privacy-sweep]
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { loadReceipt } from "./receipt.mjs";
import { renderReceipt } from "./core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function fontCss() {
  return [400, 500, 700].map((w) => {
    const b64 = readFileSync(join(root, "assets", "fonts", `plex-mono-${w}.woff2`)).toString("base64");
    return `@font-face{font-family:"Plex Mono";font-weight:${w};src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
  }).join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node tools/card.mjs <receipt.json> [--repo <url>]"); process.exit(1); }
  const ri = process.argv.indexOf("--repo");
  const repo = ri > 0 ? process.argv[ri + 1] : undefined;

  const r = loadReceipt(file);
  const commitFile = join(dirname(file), basename(file, ".json") + ".commit.json");
  const commit = existsSync(commitFile) ? JSON.parse(readFileSync(commitFile, "utf8")).root : null;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0}body{margin:0}</style></head><body>${
    renderReceipt(r, { commit, fontCss: fontCss(), repo })}</body></html>`;

  mkdirSync(join(root, "cards"), { recursive: true });
  const base = join(root, "cards", basename(file, ".json"));
  writeFileSync(`${base}.html`, html);

  let chromium;
  try { ({ chromium } = await import("playwright")); } catch {
    console.log(`Wrote ${base}.html (install playwright to also get a PNG)`); process.exit(0);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".ps-stage").screenshot({ path: `${base}.png` });
  await browser.close();
  console.log(`Share card: ${base}.png`);
}
