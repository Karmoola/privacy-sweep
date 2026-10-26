# Contributing

The adapters are the product. Platforms move and rename settings every few months, so most contributions are small YAML fixes. They matter most.

## Three ways to help

1. **Verify a platform.** Run the sweep on your own account. If every check worked, set `verified: true` and `last_checked: YYYY-MM-DD` in that adapter and open a PR. Include your country (settings differ by region).
2. **Fix a moved setting.** When the agent can't find a setting where the adapter says, it searches and writes the new path to `receipts/adapter-fixes.md`. Copy the fix into the adapter and open a PR.
3. **Add a platform or check.** Copy an existing adapter (e.g. `adapters/linkedin.yaml`) and fill it in.

## Adapter format

```yaml
platform: linkedin              # file name and id prefix
name: LinkedIn
domains: [linkedin.com]         # the agent never leaves these
login_url: https://www.linkedin.com/login
verified: false
last_checked: null
blurb: null                     # optional, shown to people under the platform name
checks:
  - id: linkedin.ai_training    # <platform>.<snake_case>
    module: settings_sweep      # settings_sweep | recordings_purge | app_audit | do_not_sell
    title: Data for generative AI improvement
    url: https://www.linkedin.com/mypreferences/d/settings/data-for-ai-improvement
    find: The "Use my data for training content creation AI models" switch   # describe it the way a person would
    recommended: off
    action: toggle              # toggle | delete | revoke | submit_form | manual
    count: false                # true if there's a number worth reporting (recordings, apps)
    export_url: null            # for deletes: where to download a copy first
    risk: low                   # low | medium | high (deletes are never low)
    reversible: true            # deletes must be false
    side_effects: null          # what the user loses, in one line
    say: null                   # optional, plain words for "Set it to" on the guided page
    heads_up: null              # optional, one or two sentences people need before they click
```

`find`, `recommended` and `notes` are written for agents. `say`, `heads_up` and `blurb` are what people see on the guided page, so keep them short and plain.

Write `find` as a description, not a CSS selector. The agent reads the page like a person, so descriptions survive redesigns that break selectors.

## Before opening a PR

```
npm run validate    # schema, unique ids, domains
npm run coverage    # regenerates COVERAGE.md
npm run build       # regenerates the browser-agent prompt and the guided page
```

## Rules for checks

- Only settings the platform itself offers. No exploits, no scraping data you don't own.
- Never automate a step that needs ID documents, payment or new terms. Use `action: manual`.
- Regional differences go in `find` ("EU and UK only").
