# React CSV 数据分析智能代理

> 基于 React、DuckDB-WASM 与 Google Gemini / OpenAI 构建的 AI 驱动纯前端 CSV 数据分析应用。

**在线演示：** [yapweijun1996.github.io/React-CSV-Data-Analysis-Agent](https://yapweijun1996.github.io/React-CSV-Data-Analysis-Agent/)

**English Documentation:** [README.md](README.md)

---

### 概述

React CSV 数据分析智能代理是一款**无需后端服务器**的网页应用。您只需上传 CSV 文件，AI 便会在浏览器中自动生成图表、洞察报告以及结构化的多分析师报告，全程无需数据离开您的设备。

### 核心功能

| 功能 | 说明 |
|------|------|
| CSV 上传与解析 | 自动识别表头、列类型、日期序列及数值指标 |
| AI 分析目标设定 | AI 根据数据集自动推荐 2–3 个分析目标 |
| 多分析师工作流 | 三个 AI 分析师角色（数据质量、业务、风险）协作，论坛聚合器汇总结论 |
| 自动图表生成 | 支持柱状图、折线图、饼图、环形图、散点图、组合图、雷达图、气泡图，含智能降级逻辑 |
| 已验证 / 待审核标签 | 每张卡片独立标记——已验证（绿色）可信赖，待审核（橙色）需人工确认 |
| AI 助手面板 | 持续对话助手，提供后续建议、AI 洞察卡及下一步操作提示 |
| 报告输出 | 支持导出执行摘要、管理层审阅及审计附录三种模板 |
| DuckDB SQL 引擎 | 基于 DuckDB-WASM 的浏览器内 SQL 聚合查询 |
| 原始数据浏览器 | 查看准备好的数据、透视、分组测试，并可直接对表格提问 AI |
| 向量语义搜索 | 基于 embedding 的相似度搜索 |
| 长期记忆 | AI 对话上下文跨会话持久化 |
| 双 AI 提供商 | 支持 Google Gemini 与 OpenAI，可在设置中切换 |

### 项目结构

```
index.html                          — 入口页面、配置项、加载动画
assets/
  csv_data_analysis_index.js        — React 主应用包（约 8 MB）
  csv_data_analysis_style.css       — 应用样式（约 242 KB）
  csv_data_analysis_vectorWorker.js — Embedding / 向量搜索 Worker
  csv_data_analysis_duckDbWorker.js — DuckDB 查询 Worker
  csv_data_analysis_editor.worker.js — Monaco 编辑器 Worker
  csv_data_analysis_*.worker.js     — 其他语言 Workers
duckdb/
  duckdb-eh.wasm                    — DuckDB WASM 二进制（EH 版本，约 34 MB）
  duckdb-mvp.wasm                   — DuckDB WASM 二进制（MVP 版本，约 38 MB）
  duckdb-browser-*.worker.js        — DuckDB 浏览器 Workers
favicon.svg
```

> **注意：** 本仓库仅包含编译后的生产构建产物，没有 `src/` 源码目录或 `package.json`。

### 快速开始

#### 前置条件

- 任意现代浏览器（Chrome、Firefox、Edge、Safari）
- 静态文件服务器（部分浏览器可直接打开 `index.html`）
- Google Gemini API Key **或** OpenAI API Key

#### 启动步骤

1. 克隆或下载本仓库：
   ```bash
   git clone https://github.com/yapweijun1996/React-CSV-Data-Analysis-Agent.git
   cd React-CSV-Data-Analysis-Agent
   ```
2. 启动静态文件服务器：
   ```bash
   npx serve .
   # 或者
   python3 -m http.server 8080
   ```
3. 在浏览器中打开 `http://localhost:8080`。
4. 在 **Settings（设置）** 面板中填入 API Key，或直接在 `index.html` 中预配置（参见[配置说明](#配置说明)）。
5. 上传 CSV 文件，AI 即开始分析。

#### 或直接使用在线演示

访问 **[yapweijun1996.github.io/React-CSV-Data-Analysis-Agent](https://yapweijun1996.github.io/React-CSV-Data-Analysis-Agent/)** — 无需安装，自备 API Key 即可使用。

### 配置说明

所有配置项通过 `index.html` 中的 `window.__CSV_AGENT_CONFIG__` 对象控制：

```html
<script>
  window.__CSV_AGENT_CONFIG__ = {
    defaultSettings: {
      provider: 'google',                        // 'google' 或 'openai'
      geminiApiKey: '',                          // 预填 Gemini API Key
      openAIApiKey: '',                          // 预填 OpenAI API Key
      simpleModel: 'gemini-3.1-flash-lite-preview',
      complexModel: 'gemini-3.1-flash-lite-preview',
      fallbackModel: 'gemini-2.5-flash',         // 503/限速时自动重试的模型
      language: 'English',                       // 改为 'Chinese' 可切换中文输出
      autoConfirmGoal: true,                     // 自动确认分析目标
    },
    // 强制锁定模型（所有用户不可修改）
    // forceSimpleModel: 'gemini-3.1-flash-lite-preview',
    // forceComplexModel: 'gemini-3.1-flash-lite-preview',
    ui: {
      endUserMode: false,             // 设为 true 可隐藏高级界面元素
      showSettingsButton: true,       // 设置按钮
      showDataWarnings: true,         // 数据警告提示
      showAgentThinkingModal: true,   // "AI 思考过程"弹窗
      showLongTermMemory: true,       // AI 长期记忆模块
      showNewSessionButton: true,     // 新建会话按钮
      showHistoryButton: true,        // 历史记录按钮
      showDatabaseButton: true,       // 数据库按钮
      showWorkspaceButton: true,      // 工作区按钮
      showWorkflowButton: true,       // 工作流按钮
      showLogsButton: true,           // 日志按钮
      showChangeGoalButton: true,     // 修改目标按钮
      showAssistantToggleButton: true,
      enableDuckDbQueryEngine: true,  // 启用 DuckDB SQL 查询引擎
    },
  };
</script>
```

### 多分析师工作流说明

每次分析均经过四阶段流水线处理：

1. **数据质量分析师** — 检查数据可靠性、完整性及潜在质量问题。
2. **业务分析师** — 挖掘业务洞察，解读数据趋势。
3. **风险分析师** — 识别风险点、阻碍因素及置信度限制。
4. **论坛聚合器** — 汇总三方报告，生成共识/分歧摘要及高管简报。

每张卡片独立标记：
- `Verified`（绿色）— 可信赖，适合直接用于报告
- `Needs review`（橙色）— SQL 优先卡，等待人工确认

### 报告模板

| 模板 | 说明 |
|------|------|
| Executive Brief（执行摘要） | 包含关键发现与建议的高层摘要 |
| Management Review（管理层审阅） | 含图表、KPI 和发现的完整证据审阅 |
| Audit Appendix（审计附录） | 含证据引用和排除项的详细数据目录 |

### 部署方式

由于所有逻辑均在浏览器运行，只需将文件托管在任意静态服务器即可：

- **GitHub Pages** — 推送到 `gh-pages` 分支
- **Netlify / Vercel** — 直接拖拽文件夹上传
- **CDN** — 修改 `index.html` 中的 `<base href="...">` 标签以匹配资源路径
- **缓存清理** — 修改 `window.__CACHE_VERSION__` 或 script/stylesheet 标签上的 `?v=` 参数

### 浏览器兼容性

| 浏览器 | 支持情况 |
|--------|----------|
| Chrome 90+ | 完全支持 |
| Firefox 90+ | 完全支持 |
| Edge 90+ | 完全支持 |
| Safari 15+ | 完全支持 |

> DuckDB-WASM 需要 WebAssembly 支持，所有主流现代浏览器均已支持。

---

## 许可证

MIT
