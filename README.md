# React CSV Data Analysis Agent

> An AI-powered, fully client-side CSV data analysis application built with React, DuckDB-WASM, and Google Gemini / OpenAI.

**Live Demo:** [yapweijun1996.github.io/React-CSV-Data-Analysis-Agent](https://yapweijun1996.github.io/React-CSV-Data-Analysis-Agent/)

**中文文档:** [README_CN.md](README_CN.md)

---

### Overview

React CSV Data Analysis Agent is a **zero-backend** web application that lets you upload a CSV file and instantly receive AI-generated charts, insights, and a structured multi-analyst report — all running inside your browser. No data ever leaves your device.

### Key Features

| Feature | Description |
|---------|-------------|
| CSV Upload & Parsing | Auto-detects headers, column types, date series, and numeric metrics |
| AI Goal Setting | AI suggests 2–3 analysis goals based on your dataset |
| Multi-Analyst Workflow | Three AI analyst roles (Data Quality, Business, Risk) collaborate; a Forum Aggregator merges their findings |
| Auto Chart Generation | Generates bar, line, pie, doughnut, scatter, combo, radar, and bubble charts with smart downgrade logic |
| Verified / Needs Review Badges | Cards are individually flagged — verified cards are trusted; others prompt human review |
| AI Assistant Panel | Persistent assistant with follow-up suggestions, AI Insight cards, and Next Steps chips |
| Report Delivery | Export as Executive Brief, Management Review, or Audit Appendix |
| DuckDB SQL Engine | In-browser SQL aggregation engine powered by DuckDB-WASM |
| Raw Data Explorer | View prepared data, pivot, group-by test, and ask AI questions directly on the table |
| Vector Semantic Search | Embedding-based similarity search over your data |
| Long-Term Memory | Persists AI conversation context across sessions |
| Dual AI Provider | Supports Google Gemini and OpenAI — switchable in settings |

### Architecture

```
index.html                          — Entry point, config, loading screen
assets/
  csv_data_analysis_index.js        — Main React application bundle (~8 MB)
  csv_data_analysis_style.css       — Application styles (~242 KB)
  csv_data_analysis_vectorWorker.js — Embedding / vector search worker
  csv_data_analysis_duckDbWorker.js — DuckDB query worker
  csv_data_analysis_editor.worker.js — Monaco editor worker
  csv_data_analysis_*.worker.js     — Additional language workers
duckdb/
  duckdb-eh.wasm                    — DuckDB WASM binary (EH build, ~34 MB)
  duckdb-mvp.wasm                   — DuckDB WASM binary (MVP build, ~38 MB)
  duckdb-browser-*.worker.js        — DuckDB browser workers
favicon.svg
```

> **Note:** This repository contains only the compiled production build. There is no `src/` directory or `package.json`.

### Getting Started

#### Prerequisites

- Any modern web browser (Chrome, Firefox, Edge, Safari)
- A static file server (or open `index.html` directly in some browsers)
- A Google Gemini API key **or** an OpenAI API key

#### Quick Start

1. Clone or download this repository:
   ```bash
   git clone https://github.com/yapweijun1996/React-CSV-Data-Analysis-Agent.git
   cd React-CSV-Data-Analysis-Agent
   ```
2. Serve the root directory with a static file server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` in your browser.
4. Enter your API key in the **Settings** panel, or pre-configure it in `index.html` (see [Configuration](#configuration)).
5. Upload a CSV file and let the AI begin its analysis.

#### Or use the live demo directly

Visit **[yapweijun1996.github.io/React-CSV-Data-Analysis-Agent](https://yapweijun1996.github.io/React-CSV-Data-Analysis-Agent/)** — no installation needed. Just bring your own API key.

### Configuration

All settings are controlled via `window.__CSV_AGENT_CONFIG__` inside `index.html`:

```html
<script>
  window.__CSV_AGENT_CONFIG__ = {
    defaultSettings: {
      provider: 'google',                        // 'google' or 'openai'
      geminiApiKey: '',                          // pre-fill Gemini API key
      openAIApiKey: '',                          // pre-fill OpenAI API key
      simpleModel: 'gemini-3.1-flash-lite-preview',
      complexModel: 'gemini-3.1-flash-lite-preview',
      fallbackModel: 'gemini-2.5-flash',         // auto-retry on 503/rate-limit
      language: 'English',
      autoConfirmGoal: true,
    },
    // Force models for all users (overrides UI settings)
    // forceSimpleModel: 'gemini-3.1-flash-lite-preview',
    // forceComplexModel: 'gemini-3.1-flash-lite-preview',
    ui: {
      endUserMode: false,             // hide advanced surfaces for end users
      showSettingsButton: true,
      showDataWarnings: true,
      showAgentThinkingModal: true,
      showLongTermMemory: true,
      showNewSessionButton: true,
      showHistoryButton: true,
      showDatabaseButton: true,
      showWorkspaceButton: true,
      showWorkflowButton: true,
      showLogsButton: true,
      showChangeGoalButton: true,
      showAssistantToggleButton: true,
      enableDuckDbQueryEngine: true,
    },
  };
</script>
```

### Multi-Analyst Workflow

The agent runs a structured 4-stage pipeline for every analysis:

1. **Data Quality Analyst** — Checks data reliability, completeness, and caveats.
2. **Business Analyst** — Extracts business insights and interprets trends.
3. **Risk Analyst** — Identifies risks, blockers, and confidence limitations.
4. **Forum Aggregator** — Merges all three memos into a consensus/disagreement summary with an executive briefing.

Cards produced by the pipeline are individually badged:
- `Verified` (green) — trusted for reporting
- `Needs review` (orange) — SQL-first card awaiting human confirmation

### Report Templates

| Template | Description |
|----------|-------------|
| Executive Brief | High-level summary with key findings and recommendations |
| Management Review | Full evidence review with charts, KPIs, and findings |
| Audit Appendix | Detailed data catalog with evidence refs and exclusions |

### Deployment

Because everything runs in the browser, deployment is as simple as hosting the files on any static host:

- **GitHub Pages** — push to a `gh-pages` branch
- **Netlify / Vercel** — drag-and-drop the folder
- **CDN** — update the `<base href="...">` tag in `index.html` to match your asset path
- **Cache busting** — change `window.__CACHE_VERSION__` or the `?v=` query string on the script/stylesheet tags

### Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 90+ | Full |
| Firefox 90+ | Full |
| Edge 90+ | Full |
| Safari 15+ | Full |

> DuckDB-WASM requires WebAssembly support. All modern browsers qualify.

---

## License

MIT
