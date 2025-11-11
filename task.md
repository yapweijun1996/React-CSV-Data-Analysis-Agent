# CSV Agent Delivery Tracker / 任务追踪表

> Snapshot 2025-02-14 — focus on stabilizing Await Gate + LangGraph runner.

## Global Milestones

| Milestone |目标| Key Outputs | Status |
| --- | --- | --- | --- |
| M1 | Graph Worker Ready & Await Gate | `graphWorker.js`, bus, AskUser node, AwaitCard | 🚧 In Progress |
| M2 | Tooling + Data Cache | data tools wrappers, IndexedDB cache, provider SDK | ⏳ Pending |
| M3 | UX Quality & Observability | error humanization, audit log, retries | ⏳ Pending |

---

## Task Backlog

| # | Task | Scope Highlights | Deliverables | Status | Notes / Risks |
| --- | --- | --- | --- | --- | --- |
| 1 | Graph & Worker Skeleton | Worker offloads LangGraph; postMessage bus; UI status pill | `/src/graph/runner.ts`, `/src/bus/client.ts`, Vite worker config, `graph/ready` ping | ✅ Done | Worker handshake + MIME-safe worker bundle + status pill |
| 2 | GraphState Model & Guards | Single source of truth for plan/await flags; per-turn budget (max 2 actions) | `/src/graph/schema.ts`, `/src/graph/guards.ts`, unit tests | ✅ Done | Guards enforce awaitingUser/plan primer & worker validation event |
| 3 | Node Pipeline (Diagnose→Adjust) | LangGraph nodes; AskUser emits `await_user`; waits for `USER_REPLY` | LangGraph PoC nodes, state sync, worker bridge | 🚧 In Progress | LangChain 計畫已串入 plan node、telemetry 同步至 GraphState；UI Timeline / Await 提示已完成，接下来要整合 System Log & rollout test |
| 4 | LLM Provider Adapter | Gemini first, OpenAI optional; tool schema passthrough; in-memory key | `/src/llm/provider.ts`, UI provider panel | 📝 Planned | Add fetch retry wrapper after Task10 |
| 5 | Data Tools Wrapper | Standardized tool interface for profile/aggregate/normalize/outlier | `/tools/data/index.ts`, `utils/aggregatePayload.ts`, worker bridge | 🚧 In Progress | Added profile/normalize/outlier facades + aggregate meta feeds Verify/Adjust via graph/tool_result；下一步把更多 node 觀測寫入 UI |
| 6 | IndexedDB Cache & Dedup | Persist sessions/views/profiles/kv; payload hash dedupe | `/src/idb/*`, hash util, migrations doc | 📝 Planned | Lock schema v1; note upgrade path |
| 7 | Await UI Integration | AwaitCard (options + free text); STATUS banner locks auto-run | `components/AwaitCard.tsx`, bus wiring, UX copy | 🚧 In Progress | AwaitCard + auto-resume + progress log 提示已完成；下一步：提醒/歷史紀錄細節 |
| 8 | Adaptive Sampling & Full Scan Opt-In | Sampling heuristics + Verify node fallback prompts | dataWorker params, Verify node logic, UI prompts | 📝 Planned | Need cooling period for full scan authorization |
| 9 | Error Humanization | Map machine codes → friendly text; collapsible raw error | `/src/errors/map.ts`, UI banner updates | 📝 Planned | Extend mapping list over time |
| 10 | Rate Limit Retry | `fetchWithRetry` w/ exponential backoff + UI notice | `utils/fetchWithRetry.ts`, provider integration | 📝 Planned | Display “Retriable wait bar” with countdown |
| 11 | DOM Tools White-list | Remove/highlight cards via safe selectors; worker-issued intents | `/src/tools/ui/*.ts`, main-thread executor | 📝 Planned | Guard selectors with prefix scope |
| 12 | Audit Log & Timeline | IndexedDB audit table; UI log viewer w/ human text & copy button | `/src/logs/*`, History panel updates | 📝 Planned | Keep ≤200 entries; rolling cleanup |
| 13 | LLM Usage Telemetry & Panel | Log token/latency/cost for LangChain + Chat flows；前端顯示 | `services/ai/apiClient.ts`, `store/useAppStore.ts`, `components/LlmUsagePanel.tsx` | ✅ Done | 目前僅保留最近 40 筆；下一步將數據嵌入 Timeline / Await UI |

---

## Next Actions / 小步计划

1. **LangChain Node Pipeline 收尾** – 把 observation 日志接入 System Log / autosave，并验证 Await UI 提示（含 cost/token）。  
2. **LLM Usage 可視化 2/2** – 把 cost/tokens 數據嵌入 System Log / Timeline，並加上簡易匯出/上限提醒。  
3. **Task 5 Data Tools Wrapper** – 完成所有工具結果 → GraphState 的標準化（payload schema、error 映射、tool in-flight 狀態）。

---

## References

- `docs/` — architecture notes
- `docs/lang-framework-comparison.md` — LangChain/LangGraph adoption memo
- `services/agent/AgentWorker.ts` — legacy planner (for migration diff)
- `storageService.ts` — current IndexedDB helpers (will be superseded)
