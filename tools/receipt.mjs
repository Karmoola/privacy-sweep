// Score a sweep receipt and compute a private commitment for it.
// Usage: node tools/receipt.mjs receipts/2026-10-26.json [--compare receipts/2026-09-26.json]
//
// The commitment is a Merkle root over salted item hashes. The salt never leaves this
// machine (receipts/.salt), so the root reveals nothing on its own. Publishing the root to
// Midnight later timestamps the receipt; any single item can then be revealed with its
// Merkle path without exposing the rest.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { join, dirname, basename } from "node:path";
import { STATUSES, score, compare } from "./core.mjs";

export { score, compare };

export function loadReceipt(path) {
  const r = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(r.items)) throw new Error(`${path}: "items" must be an array`);
  for (const it of r.items) {
    if (!it.id || !it.module || !STATUSES.includes(it.status))
      throw new Error(`${path}: item ${JSON.stringify(it.id)} needs id, module and a status in ${STATUSES.join("/")}`);
  }
  return r;
}

const sha = (...parts) => createHash("sha256").update(Buffer.concat(parts.map((p) => Buffer.from(p)))).digest();
// Stable JSON: sorted keys, so the same item always hashes the same way.
const canonical = (v) =>
  Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
  : JSON.stringify(v);

export function commitment(r, salt) {
  let level = r.items.map((it) => sha(salt, canonical(it)));
  const leaves = level.map((b) => b.toString("hex"));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(sha(level[i], level[i + 1] ?? level[i]));
    level = next;
  }
  return { root: (level[0] ?? sha(salt)).toString("hex"), leaves };
}

function getSalt(dir) {
  const p = join(dir, ".salt");
  if (!existsSync(p)) writeFileSync(p, randomBytes(32).toString("hex"), { mode: 0o600 });
  return Buffer.from(readFileSync(p, "utf8").trim(), "hex");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node tools/receipt.mjs <receipt.json> [--compare <older.json>]"); process.exit(1); }
  const r = loadReceipt(file);
  const s = score(r);
  const c = commitment(r, getSalt(dirname(file)));
  const out = join(dirname(file), basename(file, ".json") + ".commit.json");
  writeFileSync(out, JSON.stringify({ receipt: basename(file), run_at: r.run_at, root: c.root, items: c.leaves.length, score: s }, null, 2));

  console.log(`Privacy score: ${s.score_before} → ${s.score_after}`);
  console.log(`Tracking settings on: ${s.settings_on}, turned off: ${s.settings_turned_off}`);
  console.log(`Recordings and chats: ${s.recordings_found} found, ${s.recordings_deleted} deleted`);
  console.log(`Connected apps: ${s.apps_found} found, ${s.apps_revoked} revoked`);
  console.log(`Sites opted out of sale: ${s.sites_opted_out}`);
  if (s.not_available.length) console.log(`No opt-out offered: ${s.not_available.join("; ")}`);
  console.log(`Commitment: ${c.root}\n  (written to ${out}; publish with midnight/ when ready)`);

  const i = process.argv.indexOf("--compare");
  if (i > 0) {
    const flipped = compare(loadReceipt(process.argv[i + 1]), r);
    console.log(flipped.length ? `⚠ Switched back on since last sweep:\n  ${flipped.map((f) => `${f.platform}: ${f.title}`).join("\n  ")}` : "✓ Nothing switched back on since last sweep");
  }
}
