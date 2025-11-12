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
| 3 | Node Pipeline (Diagnose→Adjust) | LangGraph nodes; AskUser emits `await_user`; waits for `USER_REPLY` | LangGraph PoC nodes, state sync, worker bridge | ✅ Done | LangGraph runtime 现已默认开启（含 autosave 迁移 + fallback flag）；Graph 工具桥接统一走 LangGraph 观察，待补一次离线 E2E 记录日志即可封盘 |
| 4 | LLM Provider Adapter | Gemini first, OpenAI optional; tool schema passthrough; in-memory key | `/src/llm/provider.ts`, UI provider panel | 📝 Planned | Add fetch retry wrapper after Task10 |
| 5 | Data Tools Wrapper | Standardized tool interface for profile/aggregate/normalize/outlier | `/tools/data/index.ts`, `utils/aggregatePayload.ts`, worker bridge | ✅ Done | Graph 工具 response/meta 统一 `source/rows/duration/warnings/telemetry`，失败输出 `{errorCode,suggestion}` 并同步 observation/System Log；tool in-flight/last summary 皆在 success/fail 后复位 |
| 6 | IndexedDB Cache & Dedup | Persist sessions/views/profiles/kv; payload hash dedupe | `/src/idb/*`, hash util, migrations doc | 📝 Planned | Lock schema v1; note upgrade path |
| 7 | Await UI Integration | AwaitCard (options + free text); STATUS banner locks auto-run | `components/AwaitCard.tsx`, bus wiring, UX copy | 🚧 In Progress | AwaitCard + auto-resume + progress log 提示已完成；下一步：提醒/歷史紀錄細節 |
| 8 | Adaptive Sampling & Full Scan Opt-In | Sampling heuristics + Verify node fallback prompts | dataWorker params, Verify node logic, UI prompts | 📝 Planned | Need cooling period for full scan authorization |
| 9 | Error Humanization | Map machine codes → friendly text; collapsible raw error | `/src/errors/map.ts`, UI banner updates | 📝 Planned | Extend mapping list over time |
| 10 | Rate Limit Retry | `fetchWithRetry` w/ exponential backoff + UI notice | `utils/fetchWithRetry.ts`, provider integration | 📝 Planned | Display “Retriable wait bar” with countdown |
| 11 | DOM Tools White-list | Remove/highlight cards via safe selectors; worker-issued intents | `/src/tools/ui/*.ts`, main-thread executor | 📝 Planned | Guard selectors with prefix scope |
| 12 | Audit Log & Timeline | IndexedDB audit table; UI log viewer w/ human text & copy button | `/src/logs/*`, History panel updates | 📝 Planned | Keep ≤200 entries; rolling cleanup |
| 13 | LLM Usage Telemetry & Panel | Log token/latency/cost for LangGraph + Chat flows；前端顯示 | `services/ai/apiClient.ts`, `store/useAppStore.ts`, `components/LlmUsagePanel.tsx` | ✅ Done | 目前僅保留最近 40 筆；下一步將數據嵌入 Timeline / Await UI |
| 14 | Chat JSON Response Sanitizer | Guard chat parser against markdown fences + stray text so UI never crashes | `services/ai/chatResponder.ts`, `services/ai/chatResponseParser.ts`, regression test | ✅ Done | 新增 coerce parser + fenced JSON 測試，避免 Gemini markdown 包裝導致崩潰 |
| 15 | Chat Response Type Guard | Prevent `D.trim` crashes when provider already returns parsed objects | `services/ai/chatResponseParser.ts`, `tests/chatResponseParser.test.ts` | ✅ Done | coerce helper 自動接受 AiChatResponse/object/string，並補 regression test |
| 16 | Phase Response Conventions | Replace brittle JSON schemas with textual directives + client validation | `services/ai/phaseConventions.ts`, `tests/schemaValidation.test.ts` | ✅ Done | phase 指南描述 plan/talk/act 行為，改用容错解析 + 指令檢查不再依賴 schema |
| 17 | CSV Header Preservation | Ensure uploads keep real header row so Raw Data Explorer + cleaning get correct columns | `utils/dataProcessor.ts`, manual verification | ✅ Done | 改用 Papa header parse + fallback，避免資料第一列被當資料列顯示成 column_1/column_2 |
| 18 | Data Prep JSON Repair | Parser tolerates ```json fenced payloads when generating transform plans | `services/ai/jsonRepair.ts`, `services/ai/dataPreparer.ts`, regression tests | ✅ Done | 通用 coerceJsonObject 修復 markdown 包裝，data prep plan 不再因 ```json 崩潰 |
| 19 | Greeting Await Quick Choices | Greeting playbook must emit numbered options so AwaitGate validation不再報「missing options」 | `services/agent/engine/playbooks.ts`, `services/agent/engine/agentEngine.ts`, `services/agent/engine/toolRegistry.ts`, `tests/agentEngine.test.ts` | ✅ Done | Injected dynamic quick action list + template tokens，greeting 文案永遠輸出 `1) ...` 選項，並以 regression test (`tests/agentEngine.test.ts`) 確認 `extractQuickChoices` >= 2。 |
| 20 | Plan-only Action Guard | PLAN Primer responses必须只吐 `plan_state_update`，並裁剪 stray text/await | `services/agent/engine/agentEngine.ts`, `services/agent/engine/autoHeal.ts`, `tests/agentEngine.test.ts` | ✅ Done | limitAtomicActions 現依 promptMode 裁剪，auto-heal 新增 `maxActions`（plan-only=1），回歸測試鎖定 stray text 會被修剪。 |

---

## Next Actions / 小步计划

1. **LangGraph Default-on 烟雾测试** – 在离线环境执行 Upload→Await→Plan→Tool→Autosave 路径，记录 System Log/TL Diff 供验收。  
2. **LLM Usage 可視化 2/2** – 把 cost/tokens 數據嵌入 System Log / Timeline，並加上簡易匯出/上限提醒。  
3. **Tool History Storage 策略** – 定稿 IndexedDB Timeline/observation roll-off（N 条 + 自动清理）并写入 docs。
4. **Chat JSON Sanitizer rollout** – ✅ Completed via `coerceChatResponseJson` helper + fenced JSON regression test，Gemini markdown 導致的解析錯誤已解除。
5. **Phase Directive Guardrail** – ✅ 已改成文字約定 (`services/ai/phaseConventions.ts`) + 容错解析；`tests/schemaValidation` / `scripts/verifySchema.ts` 會檢查指令涵蓋 `plan_state_update`、`text_response`、`execute_js_code` 等關鍵詞，`npm run verify:schema && npm test` 皆綠燈，不再依賴 OpenAI `json_schema`。
6. **Dynamic AskUser Regression & Heuristics QA** – 為 `services/agent/askUserPrompt.ts` 撰寫單元測試（不同語系、缺欄位 fallback、options metadata），並驗證 `src/graph/nodes/askUser.ts` 在沒有建議時仍能回退預設選項；必要時調整 heuristics（distinct 門檻、僅在數值欄 > N 行時顯示 outlier）。
7. **Await Busy Lifecycle QA** – 現在 `handleChatMessage` 直接驅動 LangGraph，需在 Graph pipeline 完成／進入 Await 時同步結束 busy、更新 `graphActiveRunId`。補一個自動化檢查（或測試）確保 busy 旗標與 `agentAwaitingUserInput` 永遠同步。  
    - ✅ _2025-02-14 plan_：新增 `ensureAwaitBusyInvariant` helper + store `subscribe` 自動檢核 busy/await 同步，並撰寫單元測試（含 Await 進入/結束）確保違規會被偵測。  
    - ✅ _2025-02-14 impl_：`reportAwaitBusyInvariant` 於 `useAppStore` 訂閱 busy/await 快照並在違規時警告；新增 `tests/awaitBusyInvariant.test.ts` 覆蓋 await 進入/結束 + 殘留 run 三種情境。  
    - ✅ _2025-02-14 ui_：Busy/Await invariant 違規時自動推播 progress error + toast，並在恢復同步時加入 `busy/await back in sync` Telemetry log。  
    - ✅ _2025-02-14 audit_：將 Busy/Await 違規/恢復紀錄寫入 IndexedDB `audit_logs` store（限 400 筆 rolling），離線也能採樣追蹤失配頻率。
8. **LLM Turn Telemetry** – 在 `buildGraphLlmTurnPayload` 注入 requestId、prompt 字數、active sample tier 等欄位，LangGraph worker 回傳時也要帶上同一 requestId，方便追蹤一回合使用的 prompt/tokens。  
   - 🆕 _2025-02-14 plan_：擴充 Graph payload/contract，帶上 `clientTelemetry`（requestId, sampleTier, inputLength）；plan node 透過 `onPromptProfile/onUsage` 蒐集 prompt/tokens，回傳 `telemetry` 搭配同一 requestId，UI 以此寫入 LLM usage log。
   - ✅ _2025-02-14 impl_：`buildGraphLlmTurnPayload` 現加入 `promptCharCountHint`、sample tier snapshot，LangGraph pipeline event 帶回 `requestId + telemetry`（promptProfile/tokenUsage/latency）。`planNode` 透過 `onPromptProfile/onUsage` 填充 `LlmTurnTelemetry`，UI 收到 `graph/pipeline` 時寫入 LLM usage log 並顯示摘要。
9. **Tool Result Merge + Observability** – 現在 `processGraphActions` 執行 `plan_creation` 後還走 legacy `runPlanWithChatLifecycle` pipeline。需要把資料工具結果（aggregate/profile/transform）全面報回 `graph/tool_result`，由 worker → verify node 統一進入 timeline，並清除舊的 plan lifecycle 處理器。  
   - 🆕 _2025-02-14 plan_：讓 `plan_creation` 成功後僅透過 Graph tool response 建卡；提取卡片建構 helper + `recordGraphToolSuccess` 連帶 dispatch observation/tool_result，並移除 `runPlanWithChatLifecycle`。同時確保 plan tool meta（rows/schema）會同步進 Planner observation 與 timeline。  
   - ✅ _2025-02-14 impl_：`processGraphActions` 與 intent quick action 現改用 `graphDataTools.aggregatePlan + ingestAggregatePlanResult`，Graph tool response（含 rows/schema/context）直接建卡並寫入 vector store / snapshot，同步觸發 `graph/tool_result` 給 verify node；`runPlanWithChatLifecycle` 已移除。  
   - 🧪 _Follow-up_：Verify timeline / audit panels already surface `aggregate_plan` entries (pending UI hook-up); consider piping `ingestAggregatePlanResult` events into `analysisTimeline` so downstream engineers can track per-card completion。
10. **LLM Guardrail Regression Tests** – 新的 `planNode` 已完全依賴 LangGraph guard。要為以下情境建立單元/整合測試：① LLM 輸出 0 個 action；② 第二個 action 不是 atomic；③ await_user 回合後的 resume；④ guard 拋錯時能輸出 fallback text。  
    - 🆕 _2025-02-14 plan_：  
        1. 單元測：擴充 `tests/graphGuards.test.ts` → 驗證 zero-action / 非 atomic action 會 `violations`。  
        2. 整合測：新增 `tests/chatPlannerIntegration.guardrail.test.ts`（或擴 existing）模擬 `planNode` 透過 stubbed LLM 回傳上述情境，確認 `planNode` 產出 fallback text 或 queue await resume。  
        3. 確保 `planNode` 在 guard throw error 時，外層 catch 會輸出 text_response 並帶上 guard reason。  
    - ✅ _2025-02-14 impl_：`planNode` 針對缺失/非法 `stateTag` 自動使用 `StateTagFactory` 補發（plan/atomic action 皆適用），`tests/planNodeGuardrail.test.ts` 覆蓋 zero-action、atomic 無效、await resume、stateTag 補發等情境。  
11. **Reasonless Action Guard** – ✅ `runAutoHealPipeline` 現已對所有 action 缺失 `reason` 時注入 fallback（`services/agent/engine/autoHeal.ts:20-120, 268-280`）；同時新增回歸測試 `tests/agentEngine.test.ts:109-140` 確認自動補字串。System Log 不再刷紅。
12. **PendingPlan Metadata + Transform Verification** – ✅ `PendingPlanSummary` 新增 `intent/metadata`，澄清/LLM payload 均帶上結構化意圖；`actNode` 依 intent 產生 `execute_js_code`，`store/useAppStore.ts` 會在 JS transform 完成後回推 `graph/tool_result`，`verifyNode` 可立即看到刪除筆數。
13. **LangGraph-Only Planner Refactor** – ✅ 已移除 legacy `AgentWorker` / LangChain PoC；`handleChatMessage`、clarification 回覆與 busy 狀態全部透過 LangGraph worker + LLM payload 運行。`planNode` 現在直接呼叫 `generateChatResponse`，不再依賴 LangChain plan payload 或本地 heuristics，說明文檔改為 `docs/langgraph-runtime.md`。

---

- ## References

- `docs/` — architecture notes
- `docs/lang-framework-comparison.md` — LangGraph adoption memo
- `docs/langgraph-runtime.md` — 現行單一路徑（UI→LangGraph worker）說明
- `services/agent/graphPayload.ts` — LLM payload assembler
- `storageService.ts` — current IndexedDB helpers (will be superseded)
## Review Plan (2025-11-12)
1. **Scope Alignment** — Reconcile AGENTS.md + task.md requirements with current LangGraph/LangChain implementation to confirm what “review codebase” must cover.
2. **Runtime Audit** — Inspect `src/langgraph` + `src/graph/nodes/*` + LangChain tool wiring to spot blockers for fully local Plan→Act→Observe loops.
3. **Reporting** — Capture concrete issues (bugs, missing deliverables) plus remediation ideas so follow-on engineers can action them quickly.

## Review Findings (2025-11-12)
1. **Plan node never triggers without user reply** — `src/graph/nodes/plan.ts:94-112` bails out whenever `pendingUserReply` is null, so even when `payload.langChainPlan` is provided the LangGraph pipeline produces zero actions. Need a pre-plan state (e.g., `observe` populates pending reply or plan node consumes LangChain payload) so automatic Plan→Act loops can start.
2. **Broken pendingPlan wiring** — User-choice branch in `planNode` references `pendingPlanEntry` and `pendingReply.plan` (`src/graph/nodes/plan.ts:169-175`) even though the helper variable only exists inside `handleLangChainPlan` and `PendingUserReplySnapshot` (see `src/graph/schema.ts:20-33`) never carries a plan object. TypeScript fails to compile and Act node never receives a plan. Need to create a new `pendingPlanEntry` locally and supply an actual `AnalysisPlan` (likely derived from the tool preset or LangChain payload).
3. **LangChain plan bridge still depends on vendor LLMs** — `services/langchain/planBridge.ts:5-80` both duplicates the `PlanGenerationUsageEntry` import (compile error) and still calls `generateAnalysisPlans`, which routes to `callGemini/callOpenAI` (`services/ai/planGenerator.ts:2-6`). This violates the requirement to run plans locally with JSON-only tool calls. Replace with local LangChain StructuredTool executions (profile + heuristics) and drop the remote API dependency.
4. **Timeline/checkpoint deliverables missing** — App store state (`store/useAppStore.ts:930-948` and timeline updater at `1962-1975`) only tracks coarse card counts; there is no `checkpoints` collection or per-step timeline updates, and `src/langgraph/worker.ts:66-80` never records checkpoints before emitting events. Need a `checkpoints` store (IndexedDB) plus timeline model that logs Observe/Plan/Act/Verify entries each loop as outlined in task.md.

## Review Findings (2025-11-13 Round 3)
1. **Two planners still run in parallel** — Legacy `AgentWorker.handleMessage` continues to orchestrate chat turns with `generateChatResponse` (`services/agent/AgentWorker.ts:4148-4212`), while the LangGraph worker in `src/langgraph/worker.ts` drives a separate diagnose→ask→plan→act loop. They only meet through shared Zustand state (e.g., `graphPhase` influencing prompt directives at `services/agent/AgentWorker.ts:2963-3011`). There is no single state machine, so plan resets, await prompts, and loop budgets can diverge between the chat agent and the graph runtime.
2. **Graph pipeline hardcodes a second user-choice flow** — `askUserNode` always emits the fixed InvoiceMonth/Payee options (`src/graph/nodes/askUser.ts:5-72`), even when `LangChainPlan` payloads arrive from clarifications. This duplicates the clarification UX already owned by `AgentWorker` and creates conflicting await prompts (Graph waits for static options while chat asked something else).
3. **LangChain bridge still LLM-backed** — `generateLangChainPlanEnvelope` (`services/langchain/planBridge.ts:1-200`) invokes `generateAnalysisPlans`, which itself calls Gemini/OpenAI via `planGenerator.ts`. The “tool-first” LangGraph story is therefore still dependent on remote LLMs, and plan telemetry is duplicated (LangChain + AgentWorker).
4. **JSON schemas unused** — Despite defining `multiActionChatResponseSchema`/`planOnlyChatResponseSchema` (`services/ai/schemas.ts:548-569`), the OpenAI branch explicitly calls `callOpenAI(..., false, ...)` (`services/ai/chatResponder.ts:233-247`), so the schema never constrains responses, and Gemini only receives the schema as plain text. Validation now relies solely on local parsing/guards, leaving the schema layer effectively unlinked.

## Implementation Progress (2025-11-13)
- ✅ Added phase-specific response conventions (`services/ai/phaseConventions.ts`) so planner/talk/act turns rely on textual directives rather than brittle JSON schemas.
- ✅ Introduced the phase directive router (`services/ai/phaseConventions.ts`) and plumbed it through `generateChatResponse` (`services/ai/chatResponder.ts`) plus the existing `ChatResponseOptions.phase` hint so requests automatically pick the right instructions.
- ✅ Planner runtime now derives `phase` from LangGraph state (`services/agent/AgentWorker.ts:299-324`, `services/agent/AgentWorker.ts:2970-3001`) and feeds that directive into AI calls, keeping STEP1/2/3 behavior in lockstep with the graph phase.
- ✅ Phase-aware UI + sample policy landed: store tracks schema phase + `[100,300,1000,full]` tiers, auto-upgrades when confidence <0.6 or user confirms, and surfaces warnings (row-filter removal等) directly in `ChatPanel`.
- ✅ LangGraph-only planner shipped：`services/agent/AgentWorker.ts`/LangChain PoC 全數下線，`store/slices/chatSlice.ts` 直接構建 `llm_turn` payload，`src/graph/nodes/plan.ts` 在 worker 端呼叫 LLM 並透過 Guard state 更新。新流程記錄於 `docs/langgraph-runtime.md`。
