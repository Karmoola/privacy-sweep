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
    if (i.module === "recordings_purge") right = `${n((i.count_before ?? 0) - (i.count_after ?? 0))} SHREDDED`;
    else if (i.module === "app_audit") right = `${(i.count_before ?? 0) - (i.count_after ?? 0)} EVICTED`;
    else if (i.module === "do_not_sell") right = `${i.count_after ?? 1} TOLD OFF`;
    else right = "ON → OFF";
  } else if (i.status === "already_ok") right = "ALREADY OFF";
  else if (i.status === "skipped") right = counted ? `${n(i.count_before)} KEPT` : "KEPT";
  else if (i.status === "not_available") right = "NO OPT-OUT";
  else if (i.status === "manual") right = "TO DO";
  else if (i.status === "not_found") right = "MOVED?";
  else right = "FAILED";
  const strike = i.status === "not_available" ? " ps-na" : "";
  return `<div class="ps-row${strike}"><span>${esc(short(i.title))}</span><span>${right}</span></div>`;
}

// Deterministic barcode from the receipt code (decorative).
function barcode(hex, h = 46) {
  const bits = (hex || "0".repeat(64)).split("").map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join("");
  let x = 0, bars = "";
  for (let k = 0; k < bits.length && x < 420; k += 2) {
    const w = 1 + Number(bits[k]) + Number(bits[k + 1]);
    if (k % 4 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${h}"/>`;
    x += w + 1.5;
  }
  return `<svg viewBox="0 0 ${x} ${h}" preserveAspectRatio="none" width="100%" height="${h}">${bars}</svg>`;
}

// Paper grain: tiny SVG noise tile.
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .4  0 0 0 0 .3  0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`;
// base64 so image exporters don't mistake the inner url(#g) for a file to fetch
const GRAIN = "data:image/svg+xml;base64," + (typeof btoa === "function" ? btoa(GRAIN_SVG) : Buffer.from(GRAIN_SVG).toString("base64"));

/**
 * Render the receipt card.
 * @param {object} r      receipt ({ run_at, items })
 * @param {object} opts   { commit, fontCss, repo, maxItems }
 * @returns {string} HTML fragment: <div class="ps-stage">…</div> plus its <style>
 */
export function renderReceipt(r, opts = {}) {
  const s = score(r);
  const { commit = null, fontCss = "", repo = "karmoola.github.io/privacy-sweep", maxItems = 12 } = opts;
  const d = new Date(r.run_at || Date.now());
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const time = d.toISOString().slice(11, 16);
  const code = (commit || "00000000").slice(0, 8).toUpperCase();

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
  if (hidden) body += `<div class="ps-row ps-muted"><span>... and ${hidden} more</span><span></span></div>`;

  const totals = [
    ["SETTINGS SWITCHED OFF", s.settings_turned_off],
    ["RECORDINGS SHREDDED", s.recordings_deleted],
    ["OLD APPS EVICTED", s.apps_revoked],
    ["SITES TOLD \"DO NOT SELL\"", s.sites_opted_out],
    ["NO OPT-OUT OFFERED (BOO)", s.not_available.length],
  ].filter(([, v]) => v > 0);
  const acct = `${s.platforms} ACCOUNT${s.platforms === 1 ? "" : "S"}`;
  const ink = "#24221f";

  const css = `
${fontCss}
.ps-stage{width:1080px;height:1350px;background:#ffd43b;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.ps-stage:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 50% 45%,rgba(255,255,255,.35),transparent 70%)}
.ps-paper{position:relative;width:600px;background:#fffdf8 url("${GRAIN}");color:${ink};font-family:"Plex Mono","IBM Plex Mono",Menlo,Consolas,monospace;font-size:17px;line-height:1.38;padding:40px 38px 30px;transform:rotate(-2.2deg);
  box-shadow:0 30px 50px -22px rgba(90,60,0,.45),0 6px 14px rgba(90,60,0,.15);
  -webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/14px 100%,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) 50%/14px 100%;
  -webkit-mask-composite:source-in;mask-composite:intersect}
.ps-paper:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.35) 70%,rgba(255,255,255,0) 90%)}
.ps-c{text-align:center}
.ps-title{font-weight:700;font-size:34px;letter-spacing:.08em;line-height:1.1}
.ps-stars{letter-spacing:.3em;font-size:14px;margin:2px 0}
.ps-dept{font-weight:500;font-size:15px;letter-spacing:.06em}
.ps-sub{font-size:14.5px;color:#55524c;letter-spacing:.03em}
.ps-meta{display:flex;justify-content:space-between;font-size:14.5px;color:#55524c}
.ps-rule{border-top:2px dashed ${ink};margin:11px 0 9px;opacity:.55}
.ps-rule.ps-dbl{border-top:4px double ${ink};opacity:.8}
.ps-plat{font-weight:700;margin-top:6px;letter-spacing:.06em}
.ps-row{display:flex;justify-content:space-between;gap:14px;padding-left:12px;font-size:16px}
.ps-row span:last-child{white-space:nowrap;font-weight:500}
.ps-row.ps-na span:first-child{text-decoration:line-through;text-decoration-thickness:1.5px}
.ps-muted{color:#7a776f}
.ps-tot{display:flex;justify-content:space-between;font-weight:500;font-size:16px}
.ps-tot b{font-weight:700}
.ps-paid{display:flex;justify-content:space-between;font-weight:700;font-size:20px;margin-top:4px}
.ps-big{position:relative;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:27px;letter-spacing:.02em}
.ps-pen{position:absolute;right:-26px;top:-20px;width:190px;height:78px;pointer-events:none}
.ps-stamp{position:absolute;right:14px;top:50%;margin-top:-34px;transform:rotate(-13deg);color:#d42a20;border:5px solid #d42a20;border-radius:10px;padding:6px 16px 4px;font-weight:700;font-size:27px;letter-spacing:.08em;line-height:1;opacity:.8;mix-blend-mode:multiply;text-align:center}
.ps-stamp small{display:block;font-size:13px;letter-spacing:.2em;margin-top:4px}
.ps-fine{font-size:13.5px;color:#55524c;letter-spacing:.02em}
.ps-thanks{font-weight:700;font-size:17px;letter-spacing:.05em;margin-top:8px}
.ps-cut{display:flex;align-items:center;gap:8px;margin:16px -10px 12px;color:#55524c;font-size:20px}
.ps-cut:before,.ps-cut:after{content:"";flex:1;border-top:2px dashed #8a867d}
.ps-coupon{position:relative;border:2px solid ${ink};border-radius:6px;padding:12px 16px 10px}
.ps-cl{width:58%}
.ps-coupon .ps-off{font-weight:700;font-size:22px;letter-spacing:.03em;line-height:1.15;margin-bottom:4px}
.ps-coupon .ps-bc{margin:8px 0 2px}
.ps-coupon .ps-bc rect{fill:${ink}}
`;

  const pen = `<svg class="ps-pen" viewBox="0 0 190 78"><path d="M150 12 C 110 2, 30 6, 12 30 C -2 52, 40 72, 100 70 C 160 68, 186 52, 180 32 C 175 16, 140 8, 104 10" fill="none" stroke="#2546c4" stroke-width="3.2" stroke-linecap="round" opacity=".85"/></svg>`;

  return `<style>${css}</style>
<div class="ps-stage"><div class="ps-paper">
  <div class="ps-c ps-stars">* * * * * * * *</div>
  <div class="ps-c ps-title">PRIVACY SWEEP</div>
  <div class="ps-c ps-dept">DEPT. OF TAKING IT BACK</div>
  <div class="ps-c ps-sub">NO SIGN-UP · NO TRACKING · OPEN 24/7</div>
  <div class="ps-rule"></div>
  <div class="ps-meta"><span>${date} ${time}</span><span>${acct}</span></div>
  <div class="ps-meta"><span>RECEIPT #${code}</span><span>CASHIER: YOU</span></div>
  <div class="ps-rule"></div>
  ${body}
  <div class="ps-rule"></div>
  ${totals.map(([k, v]) => `<div class="ps-tot"><span>${k}</span><b>${n(v)}</b></div>`).join("")}
  <div class="ps-paid"><span>YOU PAID</span><span>$0.00</span></div>
  <div class="ps-rule ps-dbl"></div>
  <div class="ps-big"><span>PRIVACY SCORE</span><span>${s.score_before} → ${s.score_after}</span>${pen}</div>
  <div class="ps-rule"></div>
  <div class="ps-c ps-fine">NO REFUNDS ON DATA ALREADY COLLECTED.<br>COME BACK MONTHLY: THEY SWITCH THINGS BACK ON.</div>
  <div class="ps-c ps-thanks">THANK YOU FOR NOT BEING THE PRODUCT</div>
  <div class="ps-cut"><span>✂</span></div>
  <div class="ps-coupon">
    <div class="ps-cl">
      <div class="ps-off">100% OFF<br>BEING TRACKED</div>
      <div class="ps-fine">ALL ACCOUNTS · NEVER EXPIRES</div>
      <div class="ps-bc">${barcode(commit)}</div>
      <div class="ps-fine">${esc(repo)}</div>
    </div>
    <div class="ps-stamp">REDEEMED<small>${date}</small></div>
  </div>
</div></div>`;
}
