// Pure functions shared by the CLI tools and the guided web page (no Node imports).

export const STATUSES = ["already_ok", "changed", "skipped", "failed", "manual", "not_found", "not_available"];
const NA = ["not_found", "not_available"];

export function score(r) {
  const by = (m) => r.items.filter((i) => i.module === m);
  const applicable = r.items.filter((i) => !NA.includes(i.status));
  const okBefore = applicable.filter((i) => i.status === "already_ok").length;
  const okAfter = applicable.filter((i) => ["already_ok", "changed"].includes(i.status)).length;
  const pct = (n) => (applicable.length ? Math.round((100 * n) / applicable.length) : 0);
  const sum = (xs, f) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);

  const settings = by("settings_sweep").filter((i) => !NA.includes(i.status));
  const rec = by("recordings_purge");
  const apps = by("app_audit");
  const dns = by("do_not_sell");

  return {
    score_before: pct(okBefore),
    score_after: pct(okAfter),
    platforms: new Set(r.items.map((i) => i.platform)).size,
    settings_on: settings.filter((i) => i.status !== "already_ok").length,
    settings_turned_off: settings.filter((i) => i.status === "changed").length,
    recordings_found: sum(rec, (i) => i.count_before),
    recordings_deleted: sum(rec.filter((i) => i.status === "changed"), (i) => (i.count_before ?? 0) - (i.count_after ?? 0)),
    apps_found: sum(apps, (i) => i.count_before),
    apps_revoked: sum(apps, (i) => (i.count_before ?? 0) - (i.count_after ?? i.count_before ?? 0)),
    oldest_app: apps.flatMap((i) => (i.oldest_app ? [String(i.oldest_app)] : [])).sort()[0] ?? null,
    sites_opted_out: sum(dns.filter((i) => i.status === "changed"), (i) => i.count_after ?? 1),
    not_available: r.items.filter((i) => i.status === "not_available").map((i) => `${i.platform}: ${i.title}`),
    manual: r.items.filter((i) => i.status === "manual").length,
  };
}

// Items fine (or fixed) last time that are no longer in the recommended state.
export function compare(prev, cur) {
  const was = new Map(prev.items.map((i) => [i.id, i]));
  return cur.items.filter((i) => {
    const p = was.get(i.id);
    return p && ["already_ok", "changed"].includes(p.status) && !["already_ok", "changed"].includes(i.status);
  });
}

// ---------- receipt-style share card ----------

const PLATFORM_LABEL = {
  google: "GOOGLE", meta: "META", amazon: "AMAZON", microsoft: "MICROSOFT", openai: "CHATGPT",
  linkedin: "LINKEDIN", x: "X", github: "GITHUB", do_not_sell: "DO NOT SELL",
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const n = (v) => Number(v).toLocaleString("en-US");
const short = (t, max = 31) => (t.length > max ? t.slice(0, max - 1).trimEnd() + "." : t);

function itemLine(i) {
  const counted = i.count_before !== undefined;
  let right;
  if (i.status === "changed") {
    if (i.module === "recordings_purge") right = `${n(i.count_before)} DELETED`;
    else if (i.module === "app_audit") right = `${i.count_before} → ${i.count_after}`;
    else if (i.module === "do_not_sell") right = `${i.count_after ?? 1} SENT`;
    else right = "ON → OFF";
  } else if (i.status === "already_ok") right = "WAS OFF";
  else if (i.status === "skipped") right = counted ? `${n(i.count_before)} KEPT` : "KEPT";
  else if (i.status === "not_available") right = "NO OPT-OUT";
  else if (i.status === "manual") right = "TO DO";
  else if (i.status === "not_found") right = "MOVED?";
  else right = "FAILED";
  const strike = i.status === "not_available" ? " ps-na" : "";
  return `<div class="ps-row${strike}"><span>${esc(short(i.title))}</span><span>${right}</span></div>`;
}

// Deterministic decorative barcode from the commitment hash.
function barcode(hex) {
  const bits = (hex || "0".repeat(64)).split("").map((h) => parseInt(h, 16).toString(2).padStart(4, "0")).join("");
  let x = 0, bars = "";
  for (let k = 0; k < bits.length && x < 520; k += 2) {
    const w = 1 + Number(bits[k]) + Number(bits[k + 1]);
    if (k % 4 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="56"/>`;
    x += w + 1;
  }
  return `<svg viewBox="0 0 ${x} 56" preserveAspectRatio="none" width="100%" height="56">${bars}</svg>`;
}

/**
 * Render the receipt card.
 * @param {object} r      receipt ({ run_at, items })
 * @param {object} opts   { commit, fontCss, repo, maxItems }
 * @returns {string} HTML fragment: <div class="ps-stage">…</div> plus its <style>
 */
export function renderReceipt(r, opts = {}) {
  const s = score(r);
  const { commit = null, fontCss = "", repo = "github.com/Karmoola/privacy-sweep", maxItems = 18 } = opts;
  const d = new Date(r.run_at || Date.now());
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const time = d.toISOString().slice(11, 16);

  // Most interesting first inside each platform: changes, then no-opt-out, then the rest.
  const rank = { changed: 0, not_available: 1, skipped: 2, manual: 3, already_ok: 4, not_found: 5, failed: 6 };
  const order = [...new Set(r.items.map((i) => i.platform))];
  let budget = maxItems, hidden = 0, body = "";
  for (const p of order) {
    const items = r.items.filter((i) => i.platform === p).sort((a, b) => rank[a.status] - rank[b.status]);
    if (budget <= 0) { hidden += items.length; continue; }
    const show = items.slice(0, budget);
    hidden += items.length - show.length;
    budget -= show.length;
    body += `<div class="ps-plat">${PLATFORM_LABEL[p] ?? esc(p.toUpperCase())}</div>${show.map(itemLine).join("")}`;
  }
  if (hidden) body += `<div class="ps-row ps-muted"><span>+ ${hidden} more line${hidden > 1 ? "s" : ""}</span><span></span></div>`;

  const totals = [
    ["SETTINGS SWITCHED OFF", s.settings_turned_off],
    ["RECORDINGS + CHATS DELETED", s.recordings_deleted],
    ["APPS REVOKED", s.apps_revoked],
    ["SITES TOLD: DO NOT SELL", s.sites_opted_out],
    ["NO OPT-OUT OFFERED", s.not_available.length],
  ].filter(([, v]) => v > 0);

  const css = `
${fontCss}
.ps-stage{width:1080px;height:1350px;background:#e4e1da;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.ps-stage:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.55),transparent 60%),radial-gradient(ellipse at 80% 90%,rgba(0,0,0,.07),transparent 55%)}
.ps-paper{position:relative;width:620px;background:#fbfaf7;color:#1d1c1a;font-family:"Plex Mono","IBM Plex Mono",Menlo,Consolas,monospace;font-size:18px;line-height:1.4;padding:44px 40px 38px;transform:rotate(-1.4deg);
  box-shadow:0 1px 0 rgba(0,0,0,.04),0 18px 40px -12px rgba(40,30,10,.28),0 4px 10px rgba(40,30,10,.08);
  -webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/16px 100%,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) 50%/16px 100%;
  -webkit-mask-composite:source-in;mask-composite:intersect}
.ps-paper:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,0) 0 62%,rgba(120,100,60,.05) 63%,rgba(0,0,0,0) 64%)}
.ps-paper .ps-c{text-align:center}
.ps-paper .ps-title{font-weight:700;font-size:30px;letter-spacing:.12em}
.ps-paper .ps-sub{font-size:16px;color:#5d5a54;letter-spacing:.04em}
.ps-paper .ps-rule{border-top:2px dashed #3a3834;margin:14px 0 12px;opacity:.75}
.ps-paper .ps-rule.ps-dbl{border-top:4px double #3a3834;opacity:.85}
.ps-paper .ps-plat{font-weight:700;margin-top:8px;letter-spacing:.06em}
.ps-paper .ps-row{display:flex;justify-content:space-between;gap:16px;padding-left:14px;font-size:17px}
.ps-paper .ps-row span:last-child{white-space:nowrap;font-weight:500}
.ps-paper .ps-row.ps-na span:first-child{text-decoration:line-through;text-decoration-thickness:1.5px}
.ps-paper .ps-muted{color:#7a776f}
.ps-paper .ps-tot{display:flex;justify-content:space-between;font-weight:500}
.ps-paper .ps-tot b{font-weight:700}
.ps-paper .ps-big{display:flex;justify-content:space-between;font-weight:700;font-size:28px;letter-spacing:.03em}
.ps-paper .ps-bc{margin:18px 10px 4px}
.ps-paper .ps-bc rect{fill:#1d1c1a}
.ps-paper .ps-hash{font-size:13px;letter-spacing:.18em;color:#4a4842}
.ps-paper .ps-thanks{font-weight:700;margin-top:16px;letter-spacing:.05em}
`;

  return `<style>${css}</style>
<div class="ps-stage"><div class="ps-paper">
  <div class="ps-c ps-title">PRIVACY SWEEP</div>
  <div class="ps-c ps-sub">${date} &nbsp; ${time} UTC &nbsp; ${s.platforms} ${s.platforms === 1 ? "ACCOUNT" : "ACCOUNTS"}</div>
  <div class="ps-c ps-sub">RECEIPT #${(commit || "00000000").slice(0, 8).toUpperCase()}</div>
  <div class="ps-rule"></div>
  ${body}
  <div class="ps-rule"></div>
  ${totals.map(([k, v]) => `<div class="ps-tot"><span>${k}</span><b>${n(v)}</b></div>`).join("")}
  <div class="ps-rule ps-dbl"></div>
  <div class="ps-big"><span>PRIVACY SCORE</span><span>${s.score_before} → ${s.score_after}</span></div>
  <div class="ps-bc">${barcode(commit)}</div>
  <div class="ps-c ps-hash">${commit ? esc(commit.slice(0, 32).toUpperCase()) : ""}</div>
  <div class="ps-c ps-thanks">THANK YOU FOR NOT BEING THE PRODUCT</div>
  <div class="ps-c ps-sub">${esc(repo)}</div>
</div></div>`;
}
