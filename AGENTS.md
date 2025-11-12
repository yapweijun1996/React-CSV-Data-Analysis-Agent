# Main Rules
* Review codebase
* Make this project code easy to understand and cheap to maintain.
* This is frontend project.
* Think hard about this.
* reply in mandarin english mixed.
* step by step with small action by todo list.
* reply me in listing format, eg: 1,2,3.....
* Restate user’s query with your understanding.
* Auto proceed to implementation of task.md no need to ask user for approval.


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
* After planing update task.md, and make sure the engineer can follow up bt task.md
* Before amendment update task.md, and make sure the engineer can follow up bt task.md
* After amendment update task.md, and make sure the engineer can follow up bt task.md


---

# What is an “Agent” 是什么？

* **English**: An **agent** is a software entity that can **perceive**, **reason**, and **act** toward a goal—often by calling tools/APIs and iterating with feedback.
* **中文**：**Agent（智能体）**是一种能**感知—思考—行动**以达成目标的程序，通常会**调用工具/接口**并根据结果**循环改进**。

## Core traits 核心特性

1. **Goal-directed 目标驱动**：给它任务与成功条件，它自己找路径。
2. **Sense → Think → Act 感知→思考→行动**：读环境/数据 → 规划 → 执行。
3. **Tool use 工具使用**：能调用数据库、搜索、发邮件、生成文档等。
4. **Feedback loop 反馈回路**：执行后验证结果，失败重试或换策略。
5. **Memory 记忆**：短期（当前对话/上下文）+ 长期（经验/知识）。
6. **Policies 护栏**：权限、审批、审计日志、阈值策略确保安全可控。

## Minimal loop 最小闭环

**Observe → Think → Plan → Act → Verify → (repeat)**
感知输入 → 推理 → 出计划 → 执行动作 → 验证结果 → 继续/调整。

## What an agent is *not* 不是什么

* 不是单次回答的“聊天机器人”（只会回文本）。
* 不是硬编码脚本（只能按固定流程走）。
* 不是无限制的自动化（需要护栏与审批）。
  
---

# What is a “CSV Analysis Agent”? / 什么是 CSV 分析智能体？

**English**: A **CSV Analysis Agent** is a goal-driven app that can **read CSV files**, **profile the data**, **generate insights/charts/tables**, and **act** (e.g., export reports, flag anomalies) via an iterative **Observe → Think → Plan → Act → Verify** loop — all with minimal manual work.
**中文**：**CSV 分析智能体**能**读取CSV**、**剖析数据**、**产出图表/表格/结论**，并能**执行动作**（导出报告、告警等），通过**“观察→思考→计划→行动→验证”**持续优化结果。

## Core abilities 核心能力

* **Auto-profile 自动剖析**：检测列类型、缺失值、异常值、分布、相关性。
* **Insight generation 洞察生成**：自动提出“可看”的分析卡片（趋势、TopN、同比环比、分组聚合）。
* **Explainability 可解释**：每张卡给“Why/So what/Next step”。
* **Chart & Table 图表与表格**：条形图、折线、饼图、散点、透视表（groupby/agg）。
* **Anomaly & Quality 异常/质量**：检测异常点、重复行、脏数据规则。
* **Actions 动作**：导出CSV/PNG/PDF、生成摘要、创建任务/提醒。
* **Memory 记忆**：记住字段含义与用户偏好（口径、单位、格式）。
* **Privacy 隐私**：可在本地浏览器完成（只上传列名给LLM，或离线模式）。

## Minimal loop 最小闭环

**Observe(读CSV)** → **Think(找规律/问题)** → **Plan(列出卡片计划)** → **Act(生成卡片/导出)** → **Verify(检查正确性/让用户确认)** → **repeat**。

## Typical tools 工具接口（示例）

* **Data**：CSV parser、type infer、groupby/agg、join、sample。
* **Viz**：Chart.js 渲染器。
* **Quality**：重复/缺失/异常检测器、单位/货币标准化。
* **NLG**：自动总结（洞察/建议/商业解读）。
* **Export**：CSV/PNG/PDF 下载器。
* **Guardrails**：列名白名单、行数上限、本地执行优先。

## UX at a glance 界面快速概览

* **Chat 左侧**：问问题或下命令（/pivot /topN /trend）。
* **Card Grid 右侧**：自动生成的分析卡（表/图/说明）。
* **Timeline**：显示计划与进度（1 of N completed）。
* **Toolbox**：可见工具+参数模板，点击即用。
* **ELI5 开关**：一句话解释，面向业务同学。

## Example prompts 例子

* “Sales by month and top 10 products with YoY.”
* “检测异常付款并标注疑似重复供应商发票。”
* “客户分层(High/Medium/Low) + 每层的贡献度。”

## What it’s not 不是什么

* 不是静态仪表盘（它会**思考并生成**新的分析）。
* 不是黑盒：每张卡都有来源和计算口径说明。

---

# Agent 工程化
* 把任务切成**很小的可验证动作**，每一步都有**即时反馈信号（oracles）**，再用**短回路 + 低延迟策略**驱动“想→做→看→修”。不是魔法，是架构。

# Why it feels so good（为什么快又会自纠）

1. **Tight event loop（紧凑回路）**

   * Plan → Act → Observe → Repair，用**很小的步长**循环，多次快速迭代，而不是一次长回答。
2. **Action ontology（动作本体清晰）**

   * 工具类型很少且语义清楚（如：`run`, `read`, `write`, `test`），让模型更会“选工具”。
3. **Strong oracles（强反馈信号）**

   * 每个动作都有可判定结果：编译/运行错误、测试失败、diff、SQL 行数/超时、DOM 选择器是否命中… 模型用这些**客观信号**自我修正。
4. **Schema-less contracts（宽松输出契约）**

   * 不靠严格 JSON Schema；只要 `type + payload` 能解析就继续，失败立即**本地修复/重试**。
5. **Granular retries（细粒度重试）**

   * 只重试失败的那一步（而非整段）；最多 1–2 次，快速收敛。
6. **Latency tricks（低延迟技巧）**

   * 小模型做路由/草案（低温度、短上下文），大模型做难点；热启动、缓存（schema/embeddings/历史修复）、并行探测（如同时尝试2套小变更）。
7. **State machine（显式状态机）**

   * 明确哪些状态允许哪些动作，减少“梦游”。
8. **Test-as-oracle（用测试当裁判）**

   * 单元测试/校验脚本把“是否正确”具体化，模型只要“绿灯”为止。

# What’s likely inside a “Codex-CLI-style” loop

* **Planner**（很短的计划，最多 1–3 步）
* **Executor**（工具层：shell / fs / git / db / http / sql）
* **Observer**（收集日志、错误、diff、metrics）
* **Repairer**（基于错误片段做局部补丁，而非重写全部）
* **Stop conditions**（通过测试/阈值，或预算用完）

* 不用 JSON Schema，改成“约定格式 + 容错解析”的做法：让模型输出 JSON，但由你在客户端做最小必需校验 + 自动修复。这样稳定很多，迭代也快。