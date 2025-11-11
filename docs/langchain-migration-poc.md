# LangChain / LangGraph Migration PoC Plan

> Goal: 分三階段驗證 LangChain.js + LangGraph.js 能否逐步取代現有自研實作，同時維持 local-first、browser-only 的約束。每階段均需留存 PoC 代碼與回報，避免一次性大改。

---

## Phase 1 — LLM Prompt & Tool Chain PoC

**Objective**  
以 LangChain.js 的 `PromptTemplate + RunnableSequence + StructuredTool` 重寫「資料清洗 / 分析計畫」的 prompt 層，並在瀏覽器中成功執行一次呼叫。

**Scope**  
1. 建立 `poc/langchain/promptRunner.ts`，用 `@langchain/core`（browser bundle）組裝：  
   - PromptTemplate -> LLM Runnable（Gemini / OpenAI）  
   - 結果解析為現有 `AnalysisPlan` / `DataPreparationPlan` 型別。  
2. 將 `graphDataTools.profileDataset` 暴露成 LangChain `StructuredTool`（僅包 JS stub，不改原本實作）。  
3. 在 Storybook 或 `npm run dev:poc` 中演示單次 prompt + tool 使用。

**Deliverables**  
- PoC 代碼 + README（附 `@langchain/core` 安裝說明）  
- LangChain PoC 面板（App 內可以啟動 Runnable 並顯示計畫）  
- 比較紀錄：執行時間、bundle 影響、Polyfill 需求

**Risks / Notes**  
- LangChain browser build 需 tree-shaking；注意 Vite alias。  
- 先限定為開發模式（不進入正式 UI）。

---

## Phase 2 — Graph Runtime PoC

**Objective**  
把現有 `runGraphPipeline` 中的一個最小路徑（diagnose→plan→verify）改寫成 LangGraph `StateGraph`，跑在 Dedicated Worker 內，並與現有 UI bus 互通。

**Scope**  
1. 建立新 worker（`workers/langGraphWorker.ts`），透過 LangGraph `StateGraph` 描述 3 nodes。  
2. 以 `graphBus` 為基礎新增 `langGraphBus`，確保訊息協定（init/pipeline/log）一致。  
3. PoC 僅觸發 `graph/tool_result` 與 `text_response`，不接 Await Gate。

**Deliverables**  
- LangGraph worker 原型 + 狀態圖截圖  
- 對比筆記：state 同步策略、typed guard 實現方式

**Risks / Notes**  
- LangGraph 目前偏 server；需確認其 ESM bundle 是否可在 worker 中執行。  
- 如需 polyfill（`process`, `Buffer`），需評估對 bundle 體積的影響。

---

## Phase 3 — Data Tools / StructuredTool Bridge

**Objective**  
將本地工具（profile / aggregate / normalize / outlier）包裝成 LangChain `StructuredTool`，並確保 LangGraph 流程可直接調用這些工具、回報結果。

**Scope**  
1. 在 Phase1 tool stub 基礎上，把 `graphDataTools` 的四個方法對應為 LangChain 工具（with metadata）。  
2. 建立工具調度 adapter：LangGraph action → LangChain tool → 現有 IndexedDB/DuckDB。  
3. 驗證「await → tool call → verification」閉環，確保 UI 語義不變。

**Deliverables**  
- 工具 adapter 代碼 + 單元測試  
- 效能比較（與直接呼叫 `graphDataTools` 差異）

**Risks / Notes**  
- 工具執行仍在瀏覽器中，LangChain 僅提供 schema/telemetry；若未帶來實質收益，應保留自研路徑。  
- 注意 tool 例外回傳，需映射回 `GraphState.pendingVerification`.

---

## Tracking & Next Steps

- 建議為三階段各自開 issue / milestone，並在 `task.md` 的 Next Actions 追蹤。  
- 完成每階段 PoC 後，追加「Go / No-Go」決策，視收益決議是否繼續。  
- 若任何階段因 bundle 體積、瀏覽器相容性受阻，需立即回報並更新本文件。
