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
| 13 | LLM Usage Telemetry & Panel | Log token/latency/cost for LangChain + Chat flows；前端顯示 | `services/ai/apiClient.ts`, `store/useAppStore.ts`, `components/LlmUsagePanel.tsx` | ✅ Done | 目前僅保留最近 40 筆；下一步將數據嵌入 Timeline / Await UI |
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
6. **Agent Logic Review (Round 1)** – 盤點 4 個阻斷：① `planNode` 在 `pendingUserReply` 為空時直接返回（`src/graph/nodes/plan.ts:93-112`），LangChain 自動計畫始終不會推進；② 同檔案的 `pendingPlanEntry` 僅存在於 `handleLangChainPlan` 作用域，`toolSpec` 分支寫入 `state.pendingPlan` 時會觸發 `ReferenceError`（`src/graph/nodes/plan.ts:59-90` + `162-175`），Act node 永遠拿不到摘要；③ `PendingUserReplySnapshot` 型別沒有 `plan` 欄位（`src/graph/schema.ts:19-33`），所以即使 scope 修好也只能寫入 `null`，`actNode` 會一直早退（`src/graph/nodes/act.ts:3-34`）；④ `resolvePhaseSchemaKey` 永遠把非 act 模式映射成 talk（`services/agent/AgentWorker.ts:2948-2961`），導致 Graph phase = plan 時仍使用 talk 指令集，STEP1 不再強制 text ack。需逐一修復並補測。
7. **Agent Logic Review (Round 2 今日)** – 使用者回報已修改，但同 4 個阻斷仍在：`planNode` 仍早退 + LangChain payload 被丟棄、`pendingPlanEntry` scope 仍僅限 `handleLangChainPlan`、`PendingUserReplySnapshot` 依舊無 `plan` 欄位導致 `actNode` 早退、`resolvePhaseSchemaKey` 仍把 plan phase 當 talk。請按照 #6 建議修復並補 regression test。
8. **Reasonless Action Guard** – ✅ `runAutoHealPipeline` 現已對所有 action 缺失 `reason` 時注入 fallback（`services/agent/engine/autoHeal.ts:20-120, 268-280`）；同時新增回歸測試 `tests/agentEngine.test.ts:109-140` 確認自動補字串。System Log 不再刷紅。
9. **LangChain Plan Bridge + Await Reason UX** – ✅ `planNode` 會在 `pendingUserReply` 為空時照樣處理 LangChain payload 並清理手動分支的 `pendingPlan`（`src/graph/nodes/plan.ts` + `tests/planNode.test.ts`）；UI 同步顯示 await/clarification 的 reason hint（`components/AwaitCard.tsx`, `components/ChatPanel.tsx`, `store/useAppStore.ts`，`services/agent/AgentWorker.ts`），確保卡片有預設說明。
10. **Phase Schema Router + Pending Reply Plan Snapshot** – ✅ `resolvePhaseSchemaKey` 現會依 LangGraph `graphPhase` 切換 plan/talk/act schema（`services/agent/AgentWorker.ts:2952-2965`）；`PendingUserReplySnapshot` 加入 `plan` 欄位，runner/worker 都會把 `state.pendingPlan?.plan` 帶入（`src/graph/schema.ts`, `src/graph/runner.ts`, `src/langgraph/worker.ts`），`planNode` 亦在 manual 分支重建 `pendingPlan` 以便 `actNode` 自動執行分析（`src/graph/nodes/plan.ts`）。
11. **Clarification → Graph PendingPlan** – ✅ `handleClarificationResponse` 不再直接執行 `runPlanWithChatLifecycle`，改建構 `langChainPlan` payload 並呼叫 `runGraphPipeline`（`store/slices/chatSlice.ts`）。Graph plan node 會接手填入 `pendingPlan`、Act node 再統一執行，消除雙軌流程。

---

## References

- `docs/` — architecture notes
- `docs/lang-framework-comparison.md` — LangChain/LangGraph adoption memo
- `services/agent/AgentWorker.ts` — legacy planner (for migration diff)
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

## Implementation Progress (2025-11-13)
- ✅ Added phase-specific response conventions (`services/ai/phaseConventions.ts`) so planner/talk/act turns rely on textual directives rather than brittle JSON schemas.
- ✅ Introduced the phase directive router (`services/ai/phaseConventions.ts`) and plumbed it through `generateChatResponse` (`services/ai/chatResponder.ts`) plus the existing `ChatResponseOptions.phase` hint so requests automatically pick the right instructions.
- ✅ Planner runtime now derives `phase` from LangGraph state (`services/agent/AgentWorker.ts:299-324`, `services/agent/AgentWorker.ts:2970-3001`) and feeds that directive into AI calls, keeping STEP1/2/3 behavior in lockstep with the graph phase.
- ✅ Phase-aware UI + sample policy landed: store tracks schema phase + `[100,300,1000,full]` tiers, auto-upgrades when confidence <0.6 or user confirms, and surfaces warnings (row-filter removal等) directly in `ChatPanel`.
