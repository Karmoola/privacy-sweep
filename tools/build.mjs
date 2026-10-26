// Build the no-terminal versions from adapters/:
//   dist/PROMPT-browser-agent.md  one self-contained prompt for any browser agent
//   docs/index.html               guided checklist web page (GitHub Pages), no AI needed
// Usage: node tools/build.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { fontCss } from "./card.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const adapters = readdirSync(join(root, "adapters")).filter((f) => f.endsWith(".yaml")).sort()
  .map((f) => YAML.parse(readFileSync(join(root, "adapters", f), "utf8")));

// ---------- 1. Browser-agent prompt ----------
const checkLine = (a, c) =>
  `- **${c.id}** (${c.module}, ${c.action}${c.count ? ", count" : ""}, risk ${c.risk}): ${c.title}\n` +
  `  - Go to: ${c.url ?? "n/a"}\n  - Find: ${String(c.find).trim()}\n  - Recommended: ${String(c.recommended).trim()}` +
  (c.export_url ? `\n  - Offer export first: ${c.export_url}` : "");

const prompt = `# Privacy Sweep for browser agents (v${pkg.version})

Paste this whole page into a browser agent that can click around websites for you, for example ChatGPT agent mode or Atlas, Perplexity Comet, Claude in Chrome, Gemini in Chrome, or Microsoft Copilot Mode in Edge.

---

You are running **Privacy Sweep** for me in my browser. Find privacy settings, stored recordings, connected apps and sale-of-data defaults across my accounts, show me what you found, and change only what I approve.

## Rules
1. Never type my passwords or 2FA codes. If a page needs login, ask me to log in and wait.
2. Audit first and change nothing. Then only change what I approve. Ask a separate yes/no before every deletion, and offer the export link first.
3. Never pay, accept new terms, or submit forms asking for ID documents, SSN or payment. Mark those "manual".
4. If a setting isn't where the list says, look for it in that platform's settings. If you can't find it, mark it "not_found" and tell me what you saw.
5. Only visit the platforms' own sites listed below.

## Steps
1. Ask which of these platforms I use: ${adapters.filter((a) => a.platform !== "do_not_sell").map((a) => a.name).join(", ")}. Also ask whether to include "Do not sell" requests (US sites).
2. **Audit:** for each check on my platforms, record the current state (and the number, for count checks). Show me one table: Platform | Check | Now | Recommended | Risk.
3. **Apply** only what I approve, then confirm each new state.
4. **Receipt:** at the end, give me a JSON code block in exactly this shape, one item per check:
\`\`\`json
{"run_at":"<ISO time>","items":[{"id":"google.web_app_activity","platform":"google","module":"settings_sweep","title":"Web & App Activity","status":"changed","before":"on","after":"off"},{"id":"amazon.alexa_voice_history","platform":"amazon","module":"recordings_purge","title":"Alexa voice recordings","status":"changed","count_before":2690,"count_after":0}]}
\`\`\`
   status is one of: already_ok, changed, skipped, failed, manual, not_found, not_available. For app checks also include "oldest_app" (year) if shown.
5. Tell me to paste that JSON into the "Import" box on the Privacy Sweep page to get my receipt card.

## Checks
${adapters.map((a) => `### ${a.name}\n${a.notes ? `_${String(a.notes).trim()}_\n\n` : ""}${a.checks.map((c) => checkLine(a, c)).join("\n")}`).join("\n\n")}
`;
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "PROMPT-browser-agent.md"), prompt);

// ---------- 2. Guided web page ----------
const data = adapters.map((a) => ({
  platform: a.platform, name: a.name, notes: a.notes ?? null, blurb: a.blurb ?? null,
  checks: a.checks.map(({ id, module, title, url, find, recommended, action, count, export_url, risk, heads_up, say }) =>
    ({ id, module, title, url, find: String(find).trim(), recommended: String(recommended).trim(), action, count: !!count, export_url, risk,
      heads_up: heads_up ?? null, say: say ?? null })),
}));
const core = readFileSync(join(root, "tools", "core.mjs"), "utf8").replace(/^export /gm, "");
const tpl = readFileSync(join(root, "tools", "site.template.html"), "utf8");
const html = tpl
  .replace("/*__FONTS__*/", () => fontCss())
  .replace("/*__HTI__*/", () => readFileSync(join(root, "assets", "vendor", "html-to-image.js"), "utf8"))
  .replace("/*__CORE__*/", () => core)
  .replace("/*__DATA__*/null", JSON.stringify(data))
  .replace("/*__PROMPT__*/\"\"", JSON.stringify(prompt))
  .replaceAll("__VERSION__", pkg.version);
mkdirSync(join(root, "docs"), { recursive: true });
writeFileSync(join(root, "docs", "index.html"), html);

console.log(`Built dist/PROMPT-browser-agent.md (${(prompt.length / 1024).toFixed(1)} KB) and docs/index.html (${(html.length / 1024).toFixed(0)} KB)`);
