# 🧠 CSV Data Analysis Agent

An intelligent, private, web-based AI assistant that automates CSV data analysis. Upload a `.csv` file and let the agent auto-read, understand, and generate multiple aggregated views, interactive charts, and business intelligence-style reports — all locally in your browser for maximum privacy.

This advanced tool allows users to have a conversation with their data, asking for specific analyses, getting summaries, and even directing the AI to manipulate the UI and the data itself to better highlight insights.

## ✨ Key Features

*   **Uncompromising Privacy (Local-First)**: Your privacy is paramount. All CSV parsing and data aggregation happens directly in your browser via Web Workers and JavaScript. Your raw data file **never** leaves your computer. For AI-powered analysis, only the column names (the schema) and a small, representative sample of the data (typically 5-20 rows) are sent to your chosen AI provider (Google Gemini or OpenAI) to generate insights. The full dataset remains local at all times.

*   **🧠 Persistent Long-Term Memory (Local Vector Store)**: The AI has a true long-term memory powered by a fully in-browser vector database.
    *   **Local AI**: Using Transformers.js, the agent creates text embeddings directly in your browser. The required AI model (~34MB) is downloaded once from a CDN (the Hugging Face Hub) and then cached by the browser for offline use.
    *   **Persistent & Private**: Key insights from charts and conversations are stored in your browser's IndexedDB and are automatically loaded when you restore a session. This memory is never sent to any server.
    *   **Smarter Conversations**: This allows the AI to have deeper, context-aware follow-up conversations, even across different sessions.
    *   **Full Transparency**: A dedicated "Memory Panel" lets you inspect, search, and even delete items from the AI's knowledge base.

*   **📊 Interactive Raw Data Explorer**: Go beyond the charts and inspect your data directly in a powerful, spreadsheet-like interface.
    *   **Sort & Search**: Instantly sort any column or perform full-text searches across the entire dataset.
    *   **Resizable Columns & Pagination**: Easily navigate large datasets with resizable columns and a paginated view.
    *   **Verify Transformations**: See the direct results of any data cleaning or transformation the AI performs on your data.

*   **Planner + LangGraph Runtime**: 所有 Observe→Plan→Act→Verify 階段都由瀏覽器內建的 LangGraph worker 處理。UI 只負責把最新上下文序列化成 LLM 請求並播放 worker 的回傳動作，不再有第二套 `AgentWorker` 流程。
    *   **Explicit Planning**: Before starting a multi-step task, the AI will state its plan inside the `reason` field (e.g., "Plan: 1. Filter the data. 2. Create a chart. 3. Summarize the results."). This makes its strategy clear from the outset.
    *   **Sequential Execution**: The agent executes the plan by chaining multiple tools together in a sequence. It can perform a data transformation, then create several analysis cards from the new data, and finally provide a text summary that synthesizes the results, all in response to a single prompt.
    *   **Full Self-Explanation**: The agent remembers every action it takes, including the initial data preparation script. You can ask it, "Where did the 'Software Product 10' value come from?", and it will consult its logs to explain exactly how it cleaned and standardized the raw data, building trust and ensuring reproducibility.
    *   **Textual Guardrails (No JSON Schema)**: 我們改用 `phaseConventions` 文字指令與 LangGraph 守門程式檢查，避免嵌入脆弱的 JSON schema。LLM 若漏欄位會被 worker 擋下並回覆錯誤訊息。
    *   **Automation Safeguards**: The DOM action handler inspects the current card state before applying changes. Redundant requests (e.g., switching to a chart type that is already active or re-showing data that is visible) are skipped with a friendly explanation so the UI never “thrashes”.
    *   **Visible Execution Phases**: The UI surfaces each planner phase (Observing → Planning → Acting → Verifying → Reporting, plus Clarifying/Retrying states) so you always know what the assistant is doing, why it might pause, and when it needs your input.

### 🧩 Agent Architecture Notes

想了解 LangGraph worker 如何統一規劃/動作流程？詳見 [`docs/langgraph-runtime.md`](docs/langgraph-runtime.md)。

*   **AI-Powered Data Preparation**: The assistant acts as a data engineer. It intelligently analyzes your raw CSV for complex structures, summary rows, or other anomalies. It then writes and executes a custom JavaScript function on-the-fly to clean and reshape your data into a tidy, analysis-ready format.
*   **Traceable Prep Log & Learning Cache**: Every AI cleanup now emits a structured *Preparation Log* stored in IndexedDB. It captures which columns were touched, what rule ran, and the exact row deltas so you can answer “how was this column cleaned?” with evidence. In parallel, each high-signal chart is saved as a *Memory Snapshot* (summary, schema, sample rows, quality score). The planner reuses these snapshots to bias future plan generation and quality gates toward proven views—no backend required.

*   **AI Quality Gate & Smart Defaults**: The agent doesn't just blindly generate charts. It uses a two-step "quality gate" process. After generating initial ideas, it acts as its own quality reviewer, analyzing the aggregated data for each potential chart. It automatically discards uninteresting or "rubbish" charts (like those with no data variation) and for charts with many categories, it intelligently sets a default "Top 8" view with "Others" hidden, ensuring you start with clean, insightful, and readable visualizations.

*   **Persistent Session History**: Your work is always safe. The app continuously saves your current analysis to a "live session". If you reload the page, you'll be right back where you left off. When you upload a new file, your previous session is automatically archived to the History panel.

*   **Configurable AI Settings**:
    *   Choose between Google Gemini and OpenAI as your AI provider.
    *   Securely use your own API key for the selected provider.
    *   Switch between powerful models like `gemini-2.5-pro`, `gemini-2.5-flash`, `gpt-5`, and `gpt-5-mini`.
    *   Choose the agent's response language.

*   **AI-Powered Analysis Generation**: On file upload, the AI assistant proactively generates a set of 4 to 12 diverse and insightful analysis plans and visualizes them as cards. It also provides a **"Core Analysis Briefing"** in the chat, summarizing its initial understanding of your data to establish a shared context for your conversation.

*   **Interactive & Customizable Charts**:
    *   Switch between Bar, Line, Pie, Doughnut, and Scatter charts on-the-fly for any analysis.
    *   **Top N Filtering**: Focus on what matters. For charts with many categories, you can instantly filter to see the "Top 5", "Top 8", "Top 10", or "Top 20" items, with all others grouped into an "Others" category. You can also hide the "Others" group for a clearer view.
    *   Zoom and pan on charts to explore dense data.
    *   Click on data points to see details and multi-select for comparison.

*   **Conversational AI Chat & Dynamic Interaction**: Engage in a dialogue with the AI to command the interface and data.
    *   **Insightful "Point and Talk"**: The AI can highlight a relevant chart and then follow up with a detailed text explanation. When it discusses a specific chart, a **"Show Related Card"** button appears with its message, allowing you to instantly jump to the visualization it's referencing.
    *   **Interactive Filtering**: Ask the AI to "On the sales chart, show me only the Marketing and Engineering departments." The AI will apply the filter to the card instantly.
    *   **On-the-Fly JavaScript Execution**: For complex tasks, the AI can write and execute its own JavaScript during the conversation. For example, ask it to **"Create a new 'Profit' column by subtracting 'Costs' from 'Revenue'"**. The AI will generate and run the code, update the dataset, and make the new 'Profit' column available for further analysis.

*   **Comprehensive Export Options**: Export any analysis card as a PNG image, a CSV file of the aggregated data, or a full HTML report.

*   **Responsive Design**: A clean, modern interface that works seamlessly on different screen sizes, with a resizable and collapsible assistant panel.

## ⚙️ Configuration

To use the AI-powered features, you need to select an AI provider and configure your API key.

1.  Click the **Settings** icon (⚙️) in the top-right of the Assistant panel.
2.  **AI Provider**: Choose between Google Gemini and OpenAI.
3.  **API Key**: Paste your API key for the selected provider. You can get a Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey) or an OpenAI key from the [OpenAI Platform](https://platform.openai.com/api-keys).
4.  **AI Model**: Choose from the available models for your selected provider (e.g., `gemini-2.5-pro`, `gpt-5`).
5.  **Agent Language**: Select the primary language for the AI's responses and summaries.

Your settings are saved securely in your browser's local storage and are never transmitted anywhere else.

## 🌐 Embedding & Allowed Origins

Need to drop this UI inside another dashboard (iframe, new window, etc.)? Configure a cross-origin whitelist before loading the bundle:

```html
<script>
  window.CSV_AGENT_ALLOWED_ORIGINS = [
    'https://partner.example.com',
    'https://analytics.company.com'
  ];
</script>
<script src="/csv-agent/index.js" type="module"></script>
```

*   **Production**: Only the current origin plus entries in `window.CSV_AGENT_ALLOWED_ORIGINS` can exchange `postMessage` payloads (e.g., streaming CSV blobs). Messages from any other origin are dropped.
*   **Development**: When running on `localhost/127.0.0.1`, the app keeps the previous “same-origin only” guard so you can iterate safely without updating the whitelist.
*   **Ready Signal**: Once loaded, the app emits `{ type: 'ready' }` both to `window.opener` and `window.parent` for every allowed origin, so host shells know exactly when the agent is ready to receive CSV payloads.

This lightweight allowlist keeps embedded deployments secure while fully enabling iframe integrations.

## 📈 Sampled vs. Full Scan Aggregations

By default the agent now runs **full scans** whenever the dataset has ≤5,000 rows so the numbers always reflect the entire table. Larger datasets start in sampled mode (for latency), but you can always escalate to a full scan. The banner above each card tells you which mode was actually used:

* `Full scan` – every row was processed (automatically for ≤5k rows, or when you explicitly rerun a larger chart).
* `Sampled result` – appears when the worker still fell back (e.g., timeout or a browser cap). The banner lists how many rows were processed and surfaces the warning from the worker. A **Run full scan** button lets you retry (with allowFullScan already set) after reviewing the note.
* The banner also lists execution time and “last run” so you can see when the metric was refreshed.

If you ever see `Sampled result`, click **Run full scan** to recompute. A toast + progress log entry will confirm the rerun outcome.

## 🚀 How to Use

1.  **Configure your AI Provider & API Key**: Before you begin, open the settings (⚙️), select your preferred AI provider (Google Gemini or OpenAI) and add your API Key.
2.  **Upload a CSV file**: Drag and drop your file or use the file selector. This starts a new session. The AI will automatically clean and reshape the data if needed. Your work is saved automatically.
3.  **Review Auto-Analysis**: The assistant will automatically generate several analysis cards and then present its **Core Analysis Briefing** in the chat window. This is your shared starting point.
4.  **Interact with Charts**:
    *   Use the icons on a card to switch between bar, line, and pie charts.
    *   Use the "Show Top" dropdown to filter noisy charts.
    *   Use your mouse wheel to zoom and click-and-drag to pan on complex charts.
    *   Click on bars, slices, or points to select them. Hold `Ctrl` or `Cmd` to multi-select.
5.  **Explore Raw Data**: Expand the 'Raw Data Explorer' panel at the bottom to view, sort, and search your full dataset in a spreadsheet view.
6.  **Chat with the Assistant**:
    *   Open the side panel to chat. Ask for a new view (e.g., "Count of products by category").
    *   Ask a question about the data (e.g., "What's the average order value in the sales performance chart?").
    *   Ask the AI to guide you (e.g., "Highlight the most important chart and explain it to me"). Click the "Show Related Card" button on the AI's response to navigate directly to the chart it is discussing.
    *   Ask the AI to perform complex actions (e.g., "Create a new column called 'Efficiency' by dividing 'Output' by 'Hours'").
    *   If the agent responds that an action was skipped, it means the automation guard detected the UI is already in the requested state—just issue a different instruction or request a new analysis.
7.  **Manage History & Memory**:
    *   Click the "History" button in the main header to see all your past reports. You can load a previous session to continue your work or delete old reports.
    *   Click the "Memory" icon (🧠) in the Assistant panel to see what the AI has learned from your data and conversations.
8.  **Export Your Findings**: Use the export menu on any card to save your work as a PNG, CSV, or a full HTML report.

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **AI**: Google Gemini API, OpenAI API
*   **Local AI Memory**: Transformers.js (`@xenova/transformers`) for in-browser embeddings.
*   **Charting**: Chart.js with `chartjs-plugin-zoom`
*   **CSV Parsing**: PapaParse
*   **Local Storage**: IndexedDB (for session reports & AI memory) & LocalStorage (for settings) via the `idb` library.
*   **Automation Runtime**: A custom `AgentWorker` orchestrator that enforces schema validation, handles retries, and short-circuits redundant DOM operations for a smoother “hands-free” experience.

## ✅ Fact-Checked Highlights

1.  Chart.js and `chartjs-plugin-zoom` are injected via the CDN entries in `index.html` and consumed by `ChartRenderer`, so interactive zoom/pan stays local and only runs when the bundles load (`components/ChartRenderer.tsx`).
2.  Both Gemini and OpenAI responses funnel through `services/ai/chatResponder.ts`, where the Gemini branch already enforces the `multiActionChatResponseSchema` and OpenAI uses a similar request/response flow, keeping `plan_state_update` and DOM actions synchronized with the planner (`services/ai/schemas.ts`).
3.  CSV parsing, profiling, and caching are performed entirely in-browser: `utils/dataProcessor.ts` uses PapaParse + sanitizers, while `store/slices/fileUploadSlice.ts` hooks into IndexedDB-backed persistence so history and analysis cards survive reloads.
4.  Long-term memory relies on the Transformers.js pipeline downloaded in `services/vectorStore.ts`, and vector documents are persisted with embeddings to replay conversations after reopening the workspace.
5.  OpenAI calls now go through the `/v1/responses` API with `multiActionChatResponseJsonSchema`, so every action the model emits already satisfies the strict `stateTag` + planner contract before our own validator runs (`services/ai/apiClient.ts`, `services/ai/chatResponder.ts`).

## 🔍 Code Review Notes

1.  **Chart rendering depends on global CDN bundles** — `components/ChartRenderer.tsx` assumes `Chart`/`ChartZoom` are present, which fails hard when the CDN load stalls, so the UI can crash before the user even uploads a file.
2.  **OpenAI responses lack the strict JSON schema** recorded for Gemini, which makes the planner brittle when `actions` or `plan_state_update` fields are missing (`services/ai/chatResponder.ts`).
3.  **Settings and CSV parsing UX** can be confusing: model names are hard-coded (`components/SettingsModal.tsx`), and every upload treats the first row as raw data, producing `column_#` headers (`utils/dataProcessor.ts`), so users don’t clearly see or control their column names.
