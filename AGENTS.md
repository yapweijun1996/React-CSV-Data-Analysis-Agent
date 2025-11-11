# Main Rules
* Review codebase
* Make this project code easy to understand and cheap to maintain.
* This is frontend project.
* Think hard about this.
* reply in mandarin english mixed.
* step by step with small action by todo list.
* reply me in listing format, eg: 1,2,3.....
* Restate user’s query with your understanding.


# Quick Check**

* Suggestion from engineer View.
* Suggestion from user view.

# Response to User**

* Generate response to user.
* Reply me in mandarin english mixed.
* Provide option to user to choose for next step or next action. eg: A, B, C

# Others Info
* Fully frontend project.
* When review issues or bug, no need provide code, only breakdown issues or bug only.
* gpt-5 and gpt-5-mini is latest model from OPENAI

# Project Info
# CSV Agent — Frontend-Only One-Pager （项目方向）

## 1) What we’re building / 我们要做的

* **Local-first CSV 分析助手**：读取→清洗→聚合→图表，全在浏览器完成（IndexedDB + Web Workers）。
* **Agentic, step-by-step**：先问再做（Ask → **Wait** → Act），每回合最多 **1 份计划 + 1 个动作**，可复现（opChain）。
* **Zero backend**：不走网络；可选 BYO-key，但默认离线（Airplane mode）。

---

## 2) Must-have rules / 硬性规则

1. **No backend**（纯前端）
2. **Data stays local**：CSV→IndexedDB（raw / views / opChains / cards / insights）
3. **All compute in browser**：Web Workers；数据用 **DuckDB-WASM**（或 Arquero）
4. **Ask → Wait**：提问后 **必须等待用户**（awaitUser），不自动继续
5. **Domain split**：`ui.*` 动作（删卡/重排）≠ `df.*` 数据动作（聚合/清洗）
6. **Deterministic**：每回合 ≤ `plan_state_update` + 一个原子动作
7. **Reproducible**：所有变换记录为 **opChain**（SQL/JSON）；图表只是视图
8. **Offline-ready**：PWA 缓存静态资源 + WASM

---

## 3) Core user flow / 用户主流程（Happy Path）

1. 用户 **Upload CSV**（本地）
2. Agent 在 Worker 中 **Profile 列**（类型/缺失/异常、去除小计/标题行）
3. 若有歧义，Agent **提问**（例如“按金额还是按笔数？”）
4. UI 显示 **QuestionCard**（按钮 + 文本输入），**进入等待**
5. 用户点击或输入 → Agent 执行 **本地变换/聚合**（DuckDB-WASM）
6. 生成 **Cards**（表格/图表/洞察），并保存 **opChain + 视图** 到 IndexedDB
7. 用户可 **删除/重排卡片**（纯 UI 动作，不触发数据管线）

---

## 4) Minimal architecture / 最小架构

* **UI（Main thread）**：Light 模式 Timeline（可展开）、QuestionCard、Cards（Chart.js / 表格）、设置/导出
* **Agent Worker**：IntentRouter → **Governance**（信封校验/收敛）→ Executors（`ui.*` / `df.*` / `idb.*`）
* **Data Worker**：DuckDB-WASM（profile / clean / aggregate），返回 Arrow/JSON
* **IndexedDB（Dexie）**：

  * `rawFiles(id,name,hash,blob)`
  * `tables(id,fileId,name,arrow,rowCount,cols)`
  * `views(id,tableId,name,arrow,opChainId)`
  * `opChains(id,tableId,ops[])`
  * `cards(id,viewId,kind,config,layout)`
  * `insights(id,viewId,text,severity,tags[])`
  * `prepLog(id,datasetId,scope,column,rule,impactMeta)` —— 逐步清洗轨迹（只写入一次，给解释卡读）
  * `memorySnapshots(id,datasetId,viewId,title,summary,qualityScore,tags[])` —— 高价值视图快照，供计划生成/质量 Gate 循环复用

---

## 5) Built-in tools / 内置本地工具（MVP）

* `df.profile`（列画像/去除小计行）
* `df.clean_invoice_month`（归一化月份，复合值拆分）
* `df.aggregate_topN`（Top N 供应商：金额/次数/人均）
* `df.monthly_sum_vs_count`（月度金额与单据量）
* `ui.removeCard` / `ui.relayout`（纯 UI）
* `idb.saveView` / `idb.loadView`

---

## 6) What’s in / out（MVP 范围）

**In**：本地 CSV、DuckDB-WASM 计算、QuestionCard、轻量洞察、导出 CSV/Arrow/opChain、自给自足 PWA
**Out**：任何后端服务、云同步、多用户协作、大模型强依赖（可后续 BYO-key 选配）

---

## 7) 简单 6 件事

1. **Await-User Gate**：提问/列出选项 → `awaitUser` 生效，UI 显示 *Waiting for your input*，**不**自动继续
2. **Domain Router**：`ui.*` 与 `df.*` 分流；UI 动作不进入数据前置/重试
3. **Envelope Normalizer**：强制 `type===responseType`；统一 `stateTag`（`obs-<13位epoch>-<4位>`）；`stepId` 绑定 `currentStepId`
4. **QuestionCard**：按钮 + 文本框，两条路都走同一动作通道（带回 stepId）
5. **Data Worker (MVP)**：接入 DuckDB-WASM，完成 4 个 df.* 操作，结果存 IndexedDB
6. **PWA Offline**：缓存应用壳与 WASM 资源（首次在线，后续离线可用）

---

## 8) Done-when / 验收标准（简短可测）

* 断网（Airplane mode）依然可：载入应用 → 打开本地 CSV → 跑聚合 → 出卡片 → 保存到 IndexedDB → 导出结果
* 提问后 **不会**再出现 “Continuing plan …”，直到用户点击/输入
* 删除卡片 **不会**触发数据管线或自动重试
* 1000 次动作 **零** `type/responseType` 不匹配、`stateTag` 非法、`stepId` 缺失
* 每个卡片都有 “View opChain/SQL”，刷新后可按 opChain 重放

---

## 9) Risks & notes / 风险补充

* 大 CSV：用 **采样预览** + DuckDB 分页；表格虚拟化
* IndexedDB 容量：仅持久化 opChain/选定视图，大结果按需清理
* 无 LLM 模式：启用规则+工具照样可跑（LLM 选配，默认关闭）

---

**一句话**：
**纯前端**、**问就停**、**本地计算**、**可复现**。先把 **Await-User Gate / Domain Split / Envelope 一致性 / DuckDB-WASM 最小能力** 做到位，其它能力再按 opChain 逐步扩展。
