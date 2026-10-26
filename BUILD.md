# Privacy Sweep: build plan

**Goal:** a CleanYourTV-style viral tool. One agent finds and switches off buried tracking settings, recordings, connected apps and sale-of-data defaults across major platforms. It works on everyone's existing accounts with no cooperation from the platforms, and grows into Midnight's private receipts and anonymous tallies.

## How it works

```
 you ──paste PROMPT.md──▶ coding agent (Claude Code / Codex / Gemini CLI)
                              │ reads
                              ▼
                     adapters/*.yaml  ◀── contributors fix and add these
                              │ drives (Playwright MCP, local profile, you log in)
                              ▼
          platform settings pages (Google, Meta, Amazon, ...)
                              │ results
                              ▼
         receipts/<date>.json ──▶ tools/receipt.mjs ──▶ score + private commitment
                              │                              │
                              ▼                              ▼ (phase 3)
                 tools/card.mjs ──▶ share card PNG    Midnight: commitReceipt / countOptOut
```

**Key design choices**

- **Adapters describe settings in words, not CSS selectors.** The agent reads the accessibility tree like a person, so a redesign rarely breaks a check, and when one does, the agent searches and logs the fix for a contributor. This is the long tail that built CleanYourTV: TV models there, platforms and settings here.
- **Audit, then apply.** Nothing changes until the user approves. Deletes always get an export offer and their own confirmation.
- **No passwords.** The user logs in in the visible browser. The profile stays local.
- **Receipts are local and salted.** The commitment root reveals nothing until the user chooses to reveal an item.

## What's in this repo (v0.1, runs today)

| Path | What |
|---|---|
| `PROMPT.md` | The agent prompt, the actual product in v1 |
| `adapters/` | 9 adapters, 35 checks (Google, Meta, Amazon, Microsoft, ChatGPT, LinkedIn, X, GitHub, do-not-sell) |
| `tools/validate.mjs` | Schema and safety lint for adapters, builds COVERAGE.md |
| `tools/receipt.mjs` | Score, salted Merkle commitment, "switched back on" diff |
| `tools/card.mjs` | Renders the 1080×1350 receipt card |
| `tools/build.mjs` | Builds `dist/PROMPT-browser-agent.md` and `docs/index.html` (guided page) from the adapters |
| `docs/index.html` | No-AI guided checklist, live receipt, image download, import from browser agents. Host on GitHub Pages |
| `midnight/sweep.compact` | Contract sketch: receipt commitments and anonymous tallies (not compiled) |

All adapters are `verified: false`. The URLs and setting names are a best-effort starting point and must be checked on live accounts (phase 0).

## Phases

### Phase 0: verify (week 1)
- 3 to 5 people run the prompt on their own accounts, covering US plus UK/EU (settings differ: Meta's AI objection form is EU/UK only).
- Fix every moved setting. Mark adapters verified.
- Time a full sweep. The target is under 20 minutes for 5 platforms.
- **Exit:** 8 platforms verified in 2 regions, plus 3 real share cards to choose the launch image from.

### Phase 1: launch on three paths (weeks 2 to 3)
- Guided page on GitHub Pages (no AI), browser-agent prompt, coding-agent prompt. All produce the same receipt card.
- Test the browser-agent prompt on ChatGPT agent, Comet and Claude in Chrome. Some agents pause or refuse on account settings and deletions; note which work in the README.
- Publish from a **personal GitHub and X account**, not the Foundation's. It should read as a hack, not a campaign. No Midnight branding beyond the "coming" section.
- Launch post = the share card + one sentence ("My Alexa had kept 2,690 recordings. Here's the prompt that cleared it and 13 other settings"). Then Hacker News, r/privacy, r/ClaudeAI.
- Seed the contributor loop: open issues for missing platforms (TikTok, Snapchat, Pinterest, Reddit, Spotify, Apple, Samsung, Roku, Ring, car apps), each tagged `good first adapter`.
- **Exit:** 1k stars and 20+ contributors in 2 weeks (CleanYourTV did 200+ in 4 days; treat that as the ceiling, not the plan).

### Phase 2: Chrome extension (weeks 4 to 8)
For people without a terminal.
- **MV3 extension, side panel UI.** It ships the same adapters compiled to JSON and pulls updated adapter packs from the repo, so fixes land without a store update.
- **Execution:** there's no LLM in the extension by default. Each check gets an optional `selector` hint for one-click apply. When the hint fails, it falls back to *guided mode*: open the page, highlight the setting, and the user clicks it. An optional "use my own API key" mode keeps the agent behaviour.
- **GPC:** `declarativeNetRequest` adds the `Sec-GPC: 1` header on all requests, and a MAIN-world content script sets `navigator.globalPrivacyControl = true`. This module is fully automatic.
- **Permissions:** host permissions only for adapter domains. All-sites access is optional and only for GPC. This speeds up Chrome Web Store review.
- **Exit:** store approval, 5 platforms one-click, GPC on by default.

### Phase 3: Midnight layer (weeks 6 to 10, alongside phase 2)
- **Private receipts:** `commitReceipt(root)` timestamps the salted receipt root. Later the user reveals a single item with its Merkle path, for example "LinkedIn AI training was off on 26 Oct", without exposing the rest.
- **Anonymous tallies:** `countOptOut(settingId)` with a nullifier, one count per person per setting. These power a monthly "State of Defaults" report ("71% of sweepers had Alexa keeping recordings forever"). That gives press a recurring story, and it's also the product's usage metric, with no tracking of our own users.
- **No wallet needed:** sponsor transactions from a Foundation-held DUST source so users never see a wallet. Passport-based unique-human proofs come later, to stop tally inflation.
- **Spikes needed:**
  1. Compile `sweep.compact` against the current compiler (midnight-expert).
  2. Sponsored-transaction UX with no user wallet.
  3. Optionally, a zkTLS-style proof that a settings page really showed "Off", which upgrades tallies from self-attested to verified.

## Team and effort

| Phase | People | Effort |
|---|---|---|
| 0 to 1 | 1 engineer + launch support | ~2 weeks |
| 2 | 1 extension engineer | ~4 weeks |
| 3 | 1 Compact engineer + 0.5 design | ~4 weeks, overlaps phase 2 |

## Metrics

- **Launch:** stars, forks, share cards posted (search the card's footer text), contributors, adapters verified.
- **Extension:** installs, weekly active sweeps (counted locally, never sent).
- **Midnight:** receipts committed, tally submissions. These are the private usage metrics.

## Risks

| Risk | Mitigation |
|---|---|
| Platforms treat automation as a ToS breach or trigger bot checks | User is present and logged in, works at human pace on their own account in a visible browser; any CAPTCHA goes back to the user |
| Settings move and adapters rot | Description-based `find`, agent self-repair logging, verified badges, adapter packs that update without a release |
| Someone deletes chats they wanted | Export first, separate confirmation, ChatGPT chats marked high risk |
| Overclaiming what opt-outs achieve | "Not legal advice" line; the card says what was switched, not what the platform does with it |
| Midnight feels bolted on | v1 deliberately has no chain dependency. Midnight arrives where it's needed: private proof and anonymous tallies |

## Open decisions

1. Whose account launches it?
2. Does the Foundation want a v1 that doesn't touch Midnight, as the top of a funnel?
3. Do we sponsor DUST for phase 3 tallies, and what's the budget per 10k users?
4. Which 5 platforms are one-click in the extension at launch?
