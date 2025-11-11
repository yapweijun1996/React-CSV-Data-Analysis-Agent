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
| 3 | Node Pipeline (Diagnose→Adjust) | LangGraph nodes; AskUser emits `await_user`; waits for `USER_REPLY` | `/src/graph/nodes/*.ts`, node wiring map | 🚧 In Progress | Plan node now emits real plan_state_update + plan_creation; next wire data tools/adjust outputs |
| 4 | LLM Provider Adapter | Gemini first, OpenAI optional; tool schema passthrough; in-memory key | `/src/llm/provider.ts`, UI provider panel | 📝 Planned | Add fetch retry wrapper after Task10 |
| 5 | Data Tools Wrapper | Standardized tool interface for profile/aggregate/normalize/outlier | `/tools/data/index.ts`, `utils/aggregatePayload.ts`, worker bridge | 🚧 In Progress | Aggregate facade掛到 graphDataTools；await resume + plan pipeline已用它；下一步擴 profile/normalize/outlier & 減少重覆計算 |
| 6 | IndexedDB Cache & Dedup | Persist sessions/views/profiles/kv; payload hash dedupe | `/src/idb/*`, hash util, migrations doc | 📝 Planned | Lock schema v1; note upgrade path |
| 7 | Await UI Integration | AwaitCard (options + free text); STATUS banner locks auto-run | `components/AwaitCard.tsx`, bus wiring, UX copy | 🚧 In Progress | AwaitCard + auto-resume + progress log 提示已完成；下一步：提醒/歷史紀錄細節 |
| 8 | Adaptive Sampling & Full Scan Opt-In | Sampling heuristics + Verify node fallback prompts | dataWorker params, Verify node logic, UI prompts | 📝 Planned | Need cooling period for full scan authorization |
| 9 | Error Humanization | Map machine codes → friendly text; collapsible raw error | `/src/errors/map.ts`, UI banner updates | 📝 Planned | Extend mapping list over time |
| 10 | Rate Limit Retry | `fetchWithRetry` w/ exponential backoff + UI notice | `utils/fetchWithRetry.ts`, provider integration | 📝 Planned | Display “Retriable wait bar” with countdown |
| 11 | DOM Tools White-list | Remove/highlight cards via safe selectors; worker-issued intents | `/src/tools/ui/*.ts`, main-thread executor | 📝 Planned | Guard selectors with prefix scope |
| 12 | Audit Log & Timeline | IndexedDB audit table; UI log viewer w/ human text & copy button | `/src/logs/*`, History panel updates | 📝 Planned | Keep ≤200 entries; rolling cleanup |

---

## Next Actions / 小步计划

1. **Task 5 Data Tools Wrapper** – 建立 dataWorker 工具 facade（profile/aggregate/normalize/outlier）供 Graph nodes 調用，並串接 act/verify。
2. **Task 7 Await UI** – 加強提示/歷程（顯示使用者選擇、提醒訊息），確保 auto-resume 體驗完善。
3. **Task 3 Node Pipeline** – 完成 Adjust node（重播/觀測）與 Verify 輸出，等工具層穩定後補 observation log。

---

## References

- `docs/` — architecture notes
- `services/agent/AgentWorker.ts` — legacy planner (for migration diff)
- `storageService.ts` — current IndexedDB helpers (will be superseded)
