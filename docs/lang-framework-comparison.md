# LangChain / LangGraph Adoption Notes

## 当前自研架构概览

- **LLM 调用层**（`services/aiService.ts`, `services/geminiService.ts`, `services/promptTemplates.ts`, `services/ai/schemas.ts`）  
  - 手工维护 prompt、schema、retry、provider 选择。  
  - 透过 `useAppStore` 的 chat slice 直接串联 UI 与 LLM 结果。

- **Graph Runtime**（`src/graph/*`, `src/bus/client.ts`, `workers/graph` bundle）  
  - 纯前端 Dedicated Worker；`runGraphPipeline` 按 nodes 顺序执行 diagnose → askUser → plan → act → verify → adjust。  
  - `guards.ts` 负责回合预算、stateTag、await gate。  
  - `store/useAppStore.ts` 充当 orchestrator，消费 worker action、派发数据工具、维护 Await UI。

- **Data Tools 层**（`services/dataTools.ts`, `tools/data/*`, `workers/dataWorker.ts`）  
  - IndexedDB + DuckDB-WASM 组合，由 `graphDataTools` facade 提供 aggregate/profile/normalize/outlier。

## 与 LangChain.js 对比

| 需求 | 现状 | LangChain 等价 | 可否替换 |
| --- | --- | --- | --- |
| Prompt / Schema 复用 | 自建模板 + Type 定义 | `PromptTemplate`, `StructuredOutputParser` | 可替换，但需改写现有 `services/ai/*`，并处理浏览器端 bundle 体积 |
| 工具封装 / 调用 | 自建 `graphDataTools` + store 逻辑 | `Tool` / `StructuredTool`, `AgentExecutor` | LangChain 偏向 Node.js/SSR；纯浏览器工具需要自定义 adapter，收益有限 |
| 记忆/向量检索 | `services/vectorStore.ts` + 自研 snapshot | `Memory` 模块配合 `VectorStoreRetriever` | 若未来要支持 BYO-key + server，可考虑迁移；当前 local-first 继续沿用自研较轻量 |

**结论**：LangChain.js 可用来简化 prompt/schema 定义，但我们已优化为 TypeScript 常量，迁移成本大于收益。若未来需要多 provider/链式工具，才考虑逐步导入。

## 与 LangGraph 对比

| 需求 | 现状 | LangGraph 能力 | 可否替换 |
| --- | --- | --- | --- |
| 多节点状态机 | `runGraphPipeline` 顺序执行 + `graphState` 手写 | LangGraph graph DSL（节点、边、条件） | 概念对齐，可迁移；需把 state/guard/worker 重写成 LangGraph runtime |
| Await / 多 actor | `askUserNode` + store AwaitCard | LangGraph 提供 `interrupt` / `Command` | 可用，但现有 UI/worker 已满足需求 |
| 观测 / 调试工具 | 目前通过 `graph/log` + progress 消息 | LangGraph Devtools | 若要图形化调试可考虑，但需引入 LangSmith 依赖 |

**关键差异**：我们完全在浏览器 worker 中跑 graph，为了离线/PWA。LangGraph 官方实现依赖 LangChain stack（通常运行在 Node/服务器）且需 bundler 适配；想保留 offline-first，则需 fork/裁剪 LangGraph，成本高。

## 推荐策略

1. **短期**：维持自研 graph + 工具层，避免引入额外重量级依赖。把时间花在完善 `observations`、Await 流程、data tools 稳定性。
2. **中期评估**：若未来要接入云端 orchestrator 或 LangSmith 监控，再考虑将 Graph 层迁移到 LangGraph；可先以 Node.js CLI prototype 验证。
3. **文档化**：在 `README`/`task.md` 说明目前 “自建 LangGraph/LangChain 替代品”，明确原因（local-first、bundle 预算、易于定制），方便协作者理解为何不直接使用官方框架。

## 若真的要迁移，需要的步骤

1. **LLM 层**：把 Prompt/Schemas 包装成 LangChain `Runnable` + `StructuredTool`；解决浏览器 polyfill。
2. **Graph 层**：将 `GraphState`/nodes 改写成 LangGraph `StateGraph`，把 data-tool 调用暴露成 router/command；评估是否要保留 worker 机制或改 WebWorker <-> Service Worker。
3. **工具层**：LangChain 工具通常在 server 执行 —— 要保持本地运行，需要自定义 tool executor，把 IndexedDB/DuckDB 访问封装成 `call()`。  
4. **UI**：AwaitCard & progress 逻辑需对接 LangGraph `interrupt` 事件，这意味着 store 中的 `graphBus` 监听方式要重写。

总之，目前代码已经覆盖 LangChain/LangGraph 的核心功能；除非你要借助其生态（LangSmith、现成 agent 组件），否则继续维护自建实现更贴合 offline-first 目标。
