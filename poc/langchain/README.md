# LangChain Prompt PoC

> 依賴：已在 `package.json` 註冊 `@langchain/core`。若重新安裝或在離線環境，請確保 `npm install` 成功，才能在瀏覽器端載入 LangChain bundle。

## 目前可做什麼
- `promptRunner.ts` 使用 LangChain `RunnableSequence` 串接三段：抓取 `graphDataTools.profileDataset()`、組 Prompt、透過 `generateAnalysisPlans` (Gemini/OpenAI) 產出真實 AnalysisPlan。
- 完成後會將最新計畫寫入 `useAppStore.langChainLastPlan`，UI 中的 **LangChain PoC** 面板會顯示最新結果並提供按鈕觸發，再也不需要只靠 DevTools。
- 若仍想在 DevTools 驗證，可於 dev 模式執行 `window.runLangChainPromptDemo()`，console 會輸出 `plan` 與 profile snapshot。

## 下一步
- 將 LangChain Runnable 封成可重複呼叫的 service，並在 UI 中提供按鈕。（*初始版本已掛在 LangChain PoC 面板，後續可整合到正式流程*）
- 把結果回寫到 planner session（取代部分自研 nodes），為 Phase 2 LangGraph PoC 做準備。
