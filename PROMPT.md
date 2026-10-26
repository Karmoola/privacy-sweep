# Privacy Sweep: agent prompt

Paste everything below this line into Claude Code (or Codex / Gemini CLI) from inside this repo.

---

You are running **Privacy Sweep** for me. Your job is to find privacy settings, stored recordings, connected apps and sale-of-data defaults across my accounts, show me what you found, and change only what I approve.

## Tools

- Drive a real browser with the Playwright MCP server. If it is not installed, tell me to run:
  `claude mcp add playwright -- npx @playwright/mcp@latest --user-data-dir ./.profile`
  then stop and wait for me to restart.
- The browser profile lives in `./.profile` (git-ignored). It never leaves my machine.
- Read page state from the accessibility snapshot, not from screenshots, unless a page is unreadable.

## Hard rules

1. **Never type my passwords or 2FA codes.** When a page needs login, say "Please log in to <platform> in the browser window, then tell me when you're done" and wait.
2. **Audit first, change second.** Phase 1 changes nothing. Phase 2 only changes items I approve.
3. **Deletions are permanent.** For any `action: delete`, first offer to download a copy (the adapter's `export_url`), then ask a separate yes/no for that item alone.
4. **Never pay, never accept new terms, never submit a form that asks for ID documents, SSN, or payment.** Mark the item `manual` and move on.
5. **If an adapter's instructions don't match the page** (the setting moved or was renamed), search the platform's settings for it. If you find it, continue and note the new path in `receipts/adapter-fixes.md` so I can contribute the fix. If not, mark it `not_found`.
6. Stay on the platform's own domains listed in the adapter. Do not follow links elsewhere.

## Steps

### 0. Choose modules
Read every file in `adapters/`. Ask me which platforms I use and which modules to run:
- `settings_sweep`: ad personalisation, activity and location tracking, off-platform activity, AI training
- `recordings_purge`: voice recordings and AI chat history
- `app_audit`: third-party apps with access to my accounts
- `do_not_sell`: Global Privacy Control and opt-out-of-sale requests

### 1. Audit (no changes)
For each selected check: open its `url`, ask me to log in if needed, find the setting described in `find`, and record its current state. For `count` checks, record the number (recordings, chats, apps). For `app_audit`, list every app with its last-used date when shown.

Then show me one table:

| # | Platform | Check | Now | Recommended | Risk | Reversible |

and a summary line like: *"Found 47 tracking settings on, 4,212 stored recordings and chats, 37 connected apps."*

### 2. Apply (only what I approve)
Ask me: "Apply all low-risk reversible changes? (y / n / pick)". Then for each approved item: make the change, reload the page, confirm the new state, and record `before`, `after`, and the time. Ask again for each delete.

For `app_audit`, recommend revoking apps not used in 12+ months or that I don't recognise, but let me pick.

For `do_not_sell`, follow `adapters/do-not-sell.yaml`. Build the site list only from sites I name, or, if I say yes, from my local browser history (read a copy of the history file with `sqlite3`, top 50 domains by visits, show me the list before using it).

### 3. Receipts and score
Write results to `receipts/<YYYY-MM-DD>.json` using the format in `receipts/example.json`. Then run:

```
npm run receipt -- receipts/<YYYY-MM-DD>.json
npm run card -- receipts/<YYYY-MM-DD>.json
```

Tell me where the share card image is, my before/after score, and the receipt commitment hash.

### 4. Schedule a recheck
Suggest I rerun the audit in 30 days, because platforms switch settings back on. A recheck only runs Phase 1 and flags anything that changed since the last receipt.
