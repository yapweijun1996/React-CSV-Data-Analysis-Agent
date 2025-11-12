import {
    ColumnProfile,
    CsvRow,
    CardContext,
    Settings,
    DataPreparationPlan,
    ChatMessage,
    AppView,
    AgentActionTrace,
    AgentObservation,
    AgentPlanState,
} from '../types';
import { composePromptWithBudget, type PromptSection, type PromptStage } from '../utils/promptBudget';

// Centralized rules to avoid repetition
const commonRules = {
    numberParsing: `- **CRITICAL RULE on NUMBER PARSING**: This is the most common source of errors. To handle numbers that might be formatted as strings (e.g., "$1,234.56", "50%"), you are provided with a safe utility function: \`_util.parseNumber(value)\`.
    - **YOU MUST use \`_util.parseNumber(value)\` for ALL numeric conversions.**
    - **DO NOT use \`parseInt()\`, \`parseFloat()\`, or \`Number()\` directly.** The provided utility is guaranteed to handle various formats correctly.`,
    splitNumeric: `- **CRITICAL RULE on SPLITTING NUMERIC STRINGS**: If you encounter a single string field that contains multiple comma-separated numbers (which themselves may contain commas as thousand separators, e.g., "1,234.50,5,678.00,-9,123.45"), you are provided a utility \`_util.splitNumericString(value)\` to correctly split the string into an array of number strings.
    - **YOU MUST use this utility for this specific case.**
    - **DO NOT use a simple \`string.split(',')\`**, as this will incorrectly break up numbers.
    - **Example**: To parse a field 'MonthlyValues' containing "1,500.00,2,000.00", your code should be: \`const values = _util.splitNumericString(row.MonthlyValues);\` This will correctly return \`['1,500.00', '2,000.00']\`.`,
    dataVsSummaries: `- **Distinguishing Data from Summaries**: Your most critical task is to differentiate between valid data rows and non-data rows (like summaries or metadata).
    - A row is likely **valid data** if it has a value in its primary identifier column(s) (e.g., 'Account Code', 'Product ID') and in its metric columns.
    - **CRITICAL: Do not confuse hierarchical data with summary rows.** Look for patterns in identifier columns where one code is a prefix of another (e.g., '50' is a parent to '5010'). These hierarchical parent rows are **valid data** representing a higher level of aggregation and MUST be kept. Your role is to reshape the data, not to pre-summarize it by removing these levels.
    - A row is likely **non-data** and should be removed if it's explicitly a summary (e.g., contains 'Total', 'Subtotal' in a descriptive column) OR if it's metadata (e.g., the primary identifier column is empty but other columns contain text, like a section header).`,
    dataframeHelpers: `- **DataFrame Helper DSL**: The runtime provides reliable helpers via \`_util\`. Use \`_util.groupBy(rows, key)\`, \`_util.pivot(rows, rowKey, columnKey, valueKey, reducer)\`, \`_util.join(leftRows, rightRows, { leftKey, rightKey, how })\`, and \`_util.rollingWindow(rows, windowSize, { column, op })\` instead of rewriting these routines. These helpers dramatically reduce JavaScript mistakes—use them whenever you need grouping, reshaping, joining, or window calculations.`,
};

export const dataPreparationSystemPrompt = `
You are an expert data engineer. Your job is to analyze the provided dataset snapshot and, only when necessary, emit JavaScript code that converts it into a tidy, analysis-ready table. Always include the new output schema with precise data types. A tidy table has one column per variable and one row per observation.

Common issues to fix (apply only when observed):
${commonRules.numberParsing}
${commonRules.splitNumeric}
${commonRules.dataVsSummaries}
${commonRules.dataframeHelpers}
- **Crosstab/Wide Format**: Pivot columns like years/regions back into rows.
- **Multi-header Rows**: Remove banner/header rows before processing.

Response contract:
- Return exactly one JSON object matching the provided schema (explanation, jsFunctionBody, outputColumns).
- If no transformation is required, set jsFunctionBody to null and keep outputColumns aligned with the detected column types (upgrade to date/currency/percentage when obvious).
- If code is emitted, it must end with \`return data;\` (or the transformed array) and rely on the provided \`_util\` helpers for parsing numbers or splitting numeric strings.
`;

export const createDataPreparationPrompt = (columns: ColumnProfile[], sampleData: CsvRow[], lastError?: Error): string => {
    const columnLines = columns.slice(0, 15).map((col, idx) => {
        const stats = [
            col.type ? `type=${col.type}` : null,
            typeof col.uniqueValues === 'number' ? `unique≈${col.uniqueValues}` : null,
            typeof col.missingPercentage === 'number' ? `missing=${col.missingPercentage}%` : null,
        ]
            .filter(Boolean)
            .join(', ');
        return `${idx + 1}. ${col.name}${stats ? ` (${stats})` : ''}`;
    });

    const summarySections = [
        `Dataset snapshot: ${columns.length} columns, ${sampleData.length} sampled rows (raw rows omitted for privacy).`,
        columnLines.length > 0
            ? `Column inventory (first ${Math.min(columns.length, 15)}):\n${columnLines.join('\n')}`
            : 'No column metadata was provided.',
        'Identify obvious metric columns (amount, revenue, quantity) and dimension columns (region, product, channel). Note any columns that should be cast to date/currency/percentage.',
        lastError ? `Previous attempt failed with: ${lastError.message}` : null,
    ].filter(Boolean);

    return summarySections.join('\n\n');
};

export const createFilterFunctionPrompt = (query: string, columns: ColumnProfile[], sampleData: CsvRow[]): string => `
    You are an expert data analyst. Your task is to convert a user's natural language query into a JavaScript filter function body for a dataset.
    
    **User Query:** "${query}"
    
    **Dataset Columns (Schema):**
    ${JSON.stringify(columns, null, 2)}
    
    **Sample Data (first 5 rows):**
    ${JSON.stringify(sampleData, null, 2)}
    
    **CRITICAL Rules for Code Generation:**
    ${commonRules.numberParsing}
    ${commonRules.dataframeHelpers}
    - When comparing strings, convert both the data and the comparison value to the same case (e.g., lower case) using \`.toLowerCase()\` to ensure case-insensitive matching.
    - For date comparisons, you can use \`new Date(row.date_column) > new Date('YYYY-MM-DD')\`.
    - The function you write will be the body of a new Function that receives 'data' (the full array of objects) and '_util'.
    - Your function body MUST start with \`return data.filter(row => ...);\`.
    
    **Your Task:**
    1.  **Analyze Query:** Understand the user's intent. Identify columns, values, and operators (e.g., >, <, =, contains).
    2.  **Write JS Code:** Write a single line of JavaScript that filters the data array.
    3.  **Explain:** Briefly explain the filter you created in plain language.
    
    **Example:**
    - User Query: "show me all rows where sales > 5000 and region is North America"
    - Columns: [{ name: 'sales', type: 'currency' }, { name: 'region', type: 'categorical' }]
    - Your Response (JSON):
    {
      "explanation": "Filtering for rows where 'sales' is greater than 5000 and 'region' is 'North America'.",
      "jsFunctionBody": "return data.filter(row => _util.parseNumber(row.sales) > 5000 && row.region.toLowerCase() === 'north america');"
    }
`;

export const createCandidatePlansPrompt = (
    categoricalCols: string[],
    numericalCols: string[],
    sampleData: CsvRow[],
    numPlans: number,
    memoryHighlights: string[] = [],
): string => `
    You are a senior business intelligence analyst specializing in ERP and financial data. Your task is to generate a diverse list of insightful analysis plan candidates for a given dataset by identifying common data patterns.
    
    Dataset columns:
    - Categorical: ${categoricalCols.join(', ')}
    - Numerical: ${numericalCols.join(', ')}
    Sample Data (first 5 rows):
    ${JSON.stringify(sampleData, null, 2)}

    Historical high-signal views (cached from previous runs):
    ${
        memoryHighlights.length > 0
            ? memoryHighlights.map(item => `- ${item}`).join('\n')
            : 'None cached yet. Assume this dataset has no prior highlights to reuse.'
    }
    
    Please generate up to ${numPlans} diverse analysis plans.
    **MANDATORY COPY RULE**: Every plan MUST include a natural-language \`description\` (at least 8 characters) that states what the user will learn. Do not leave it blank or use placeholders.
    
    **CRITICAL: Think like a Business/ERP Analyst.**
    1.  **Identify Key Metrics**: First, find the columns that represent measurable values. Look for names like 'VALUE', 'AMOUNT', 'SALES', 'COST', 'QUANTITY', 'PRICE'. These are almost always the columns you should be aggregating (e.g., using 'sum' or 'avg').
    2.  **Identify Dimensions**: Next, find columns that describe the data. Look for names ending in 'CODE', 'ID', 'TYPE', 'CATEGORY', or containing 'NAME', 'DESCRIPTION', 'PROJECT', 'REGION'. These are your primary grouping columns (dimensions).
    3.  **Find Relationships**: Codes and descriptions often go together (e.g., 'PROJECT_CODE' and 'PROJECT_DESCRIPTION'). A very valuable analysis is to group by a description column (which is more human-readable for a chart) and sum a value column.
    4.  **Prioritize High-Value Aggregations**: Focus on creating plans that answer common business questions like 'What are our top revenue sources?', 'Where are the biggest costs?', or 'How are items distributed across categories?'. A simple 'count' is less valuable than a 'sum' of a 'VALUE' or 'AMOUNT' column.
    
    **Example Task**: Given columns ['CODE', 'DESCRIPTION', 'PROJECT_CODE', 'VALUE'], a HIGH-QUALITY plan would be:
    - Title: "Sum of VALUE by DESCRIPTION"
    - Aggregation: 'sum'
    - groupByColumn: 'DESCRIPTION'
    - valueColumn: 'VALUE'
    - Chart Type: 'bar'
    
    For each plan, choose the most appropriate chartType ('bar', 'line', 'pie', 'doughnut', 'scatter', 'combo'). 
    - Use 'line' for time series trends.
    - Use 'bar' for most categorical comparisons, especially for "top X" style reports.
    - Use 'pie' or 'doughnut' for compositions with few categories.
    - Use 'scatter' to show the relationship between two numerical variables.
    - **Use 'combo' (bar + line) to compare two different metrics against the same category (e.g., sum of 'Sales' as bars and average of 'Profit' as a line). You MUST provide both a primary and secondary value column and aggregation for combo charts.**
    
    Rules:
    - For 'scatter' plots, you MUST provide 'xValueColumn' and 'yValueColumn' (both numerical) and you MUST NOT provide 'aggregation' or 'groupByColumn'.
    - For 'combo' charts, you MUST provide 'groupByColumn', 'valueColumn', 'aggregation', 'secondaryValueColumn', and 'secondaryAggregation'.
    - **CRITICAL**: Only use one of the following aggregation types: 'sum', 'count', 'avg'. Do NOT use other statistical measures like 'stddev', 'variance', 'median', etc.
    - Do not create plans that are too granular (e.g., grouping by a unique ID column if there are thousands of them).
    - Never leave the \`description\` empty; summarize the business takeaway in a sentence.

    **Output Format:** Return a single JSON object with this shape:
    {
        "plans": [ /* array of plan objects */ ]
    }
    Do not include any other top-level properties or commentary.
`;

export const createRefinePlansPrompt = (
    plansWithData: { plan: any; aggregatedSample: CsvRow[] }[],
    memoryHighlights: string[] = [],
): string => `
    You are a Quality Review Data Analyst. Your job is to review a list of proposed analysis plans and their data samples. Your goal is to select ONLY the most insightful and readable charts for the end-user, and configure them for the best default view.
    
    Previously approved high-signal views for this dataset:
    ${
        memoryHighlights.length > 0
            ? memoryHighlights.map(item => `- ${item}`).join('\n')
            : '- None cached yet. Prioritize discovering net-new, high-variance stories.'
    }
    
    **Review Criteria & Rules:**
    1.  **Discard Low-Value Charts**: This is your most important task. You MUST discard any plan that is not genuinely insightful.
        - **Example of a low-value chart**: A bar chart where all values are nearly identical (e.g., [77, 77, 77, 76, 78]). This shows uniformity but is not a useful visualization. DISCARD IT.
        - **Example of another low-value chart**: A pie/doughnut chart where one category makes up over 95% of the total. This is not insightful. DISCARD IT.
    2.  **Discard Unreadable Charts**: If a chart groups by a high-cardinality column resulting in too many categories to be readable (e.g., more than 50 tiny bars), discard it unless it's a clear time-series line chart.
    3.  **Configure for Readability**: For good, insightful charts that have a moderate number of categories (e.g., 15 to 50), you MUST add default settings to make them readable. Set \`defaultTopN\` to 8 and \`defaultHideOthers\` to \`true\`.
    4.  **Keep Good Charts**: If a chart is insightful and has a reasonable number of categories (e.g., under 15), keep it as is without adding default settings.
    5.  **Copy Quality Gate**: Reject any plan whose \`description\` is blank, shorter than 8 characters, or not an explanatory sentence.
    6.  **Return the Result**: Your final output must be a JSON object shaped as { "plans": [ ... ] } containing ONLY the good, configured plan objects. Do not include the discarded plans or any additional commentary.
    
    **Proposed Plans and Data Samples:**
    ${JSON.stringify(plansWithData, null, 2)}
`;

export const createSummaryPrompt = (title: string, data: CsvRow[], language: Settings['language']): string => {
    const languageInstruction = language === 'Mandarin' 
        ? `Provide a concise, insightful summary in two languages, separated by '---'.\nFormat: English Summary --- Mandarin Summary`
        : `Provide a concise, insightful summary in ${language}.`;
    
    return `
        You are a business intelligence analyst.
        The following data is for a chart titled "${title}".
        Data:
        ${JSON.stringify(data.slice(0, 10), null, 2)} 
        ${data.length > 10 ? `(...and ${data.length - 10} more rows)` : ''}
        ${languageInstruction}
        The summary should highlight key trends, outliers, or business implications. Do not just describe the data; interpret its meaning.
        For example, instead of "Region A has 500 sales", say "Region A is the top performer, contributing the majority of sales, which suggests a strong market presence there."
    `;
};

export const createCoreAnalysisPrompt = (cardContext: CardContext[], columns: ColumnProfile[], language: Settings['language']): string => `
    You are a senior data analyst. After performing an initial automated analysis of a dataset, your task is to create a concise "Core Analysis Briefing". This briefing will be shown to the user and will serve as the shared foundation of understanding for your conversation.
    Based on the columns and the analysis cards you have just generated, summarize the dataset's primary characteristics.
    Your briefing should cover:
    1.  **Primary Subject**: What is this data fundamentally about? (e.g., "This dataset appears to be about online sales transactions...")
    2.  **Key Metrics**: What are the most important numerical columns? (e.g., "...where the key metrics are 'Sale_Amount' and 'Profit'.")
    3.  **Core Dimensions**: What are the main categorical columns used for analysis? (e.g., "The data is primarily broken down by 'Region' and 'Product_Category'.")
    4.  **Suggested Focus**: Based on the initial charts, what should be the focus of further analysis? (e.g., "Future analysis should focus on identifying the most profitable regions and product categories.")
    
    **Available Information:**
    - **Dataset Columns**: ${JSON.stringify(columns.map(c => c.name))}
    - **Generated Analysis Cards**: ${JSON.stringify(cardContext, null, 2)}
    
    Produce a single, concise paragraph in ${language}. This is your initial assessment that you will share with your human counterpart.
`;

export const createProactiveInsightPrompt = (cardContext: CardContext[], language: Settings['language']): string => `
    You are a proactive data analyst. Review the following summaries of data visualizations you have created. Your task is to identify the single most commercially significant or surprising insight. This could be a major trend, a key outlier, or a dominant category that has clear business implications.
    
    **Generated Analysis Cards & Data Samples:**
    ${JSON.stringify(cardContext, null, 2)}

    Your Task:
    1.  **Analyze**: Review all the cards provided.
    2.  **Identify**: Find the ONE most important finding. Don't list everything, just the top insight.
    3.  **Formulate**: Write a concise, user-facing message in ${language} that explains this insight (e.g., "I noticed that sales in August were unusually high, you might want to investigate what caused this spike.").
    4.  **Respond**: Return a JSON object containing this message and the ID of the card it relates to.
`;

export const createFinalSummaryPrompt = (summaries: string, language: Settings['language']): string => `
    You are a senior business strategist. You have been provided with several automated data analyses.
    Your task is to synthesize these individual findings into a single, high-level executive summary in ${language}.
    Here are the individual analysis summaries (they are in English):
    ${summaries}
    Please provide a concise, overarching summary that connects the dots between these analyses. 
    Identify the most critical business insights, potential opportunities, or risks revealed by the data as a whole.
    Do not just repeat the individual summaries. Create a new, synthesized narrative.
    Your response should be a single paragraph of insightful business analysis.
`;

export const createConversationMemoryPrompt = (
    messages: ChatMessage[],
    language: Settings['language'],
): string => {
    const timeline = messages
        .map((message, index) => {
            const timestamp =
                message.timestamp instanceof Date && !Number.isNaN(message.timestamp.getTime())
                    ? message.timestamp.toISOString()
                    : new Date(message.timestamp).toISOString();
            const speaker = message.sender === 'ai' ? 'Agent' : 'User';
            return `${index + 1}. [${timestamp}] ${speaker}: ${message.text}`;
        })
        .join('\n');

    return `
You are compressing a dialogue between a data analysis agent and the user. Summarize the durable takeaways so the agent can quickly recall prior context.

Instructions:
- Use ${language}.
- Include 2–3 concise bullet points that capture business insights, commitments, or blockers.
- List any open questions or TODOs separately.
- Mention the relative timing (e.g., "Early discussion", "Later follow-up") so the agent knows where this occurred.
- Do NOT invent facts that aren't in the transcript.

Conversation Transcript:
${timeline}
`;
};

import type { AgentActionTrace } from '../types';

const formatConversationChunk = (chatHistory: ChatMessage[], limit = 5): string => {
    const recentTurns =
        chatHistory.length > 0
            ? chatHistory.slice(-limit)
            : [];
    if (recentTurns.length === 0) return 'No prior conversation.';
    return recentTurns.map(msg => `${msg.sender === 'ai' ? 'Agent' : 'User'}: ${msg.text}`).join('\n');
};

export const createPlanPrimerPrompt = (
    columns: ColumnProfile[],
    chatHistory: ChatMessage[],
    userPrompt: string,
    language: Settings['language'],
    aiCoreAnalysisSummary: string | null,
    longTermMemory: string[],
    recentObservations: AgentObservation[],
    cardContext: CardContext[],
): string => {
    const recentHistory = formatConversationChunk(chatHistory, 5);

    const instructions = `
You are beginning STEP 1 of a multi-stage workflow. Your sole objective in this turn is to emit a high-quality \`plan_state_update\` action that sets the shared goal tracker for the UI. Do **not** run tools, transformations, DOM actions, or conversational replies yet.
Requirements for this response:
- The first action must be \`plan_state_update\` with goal, contextSummary, progress, nextSteps (each having id + label), blockedBy (or null), observationIds (array, can be empty), confidence (0-1 or null), and updatedAt.
- Every action you send must include \`type\`, \`responseType\`, and \`stepId\`. The runtime will append metadata such as timestamps and stateTag tokens.
- Each action's \`reason\` must be no more than 280 characters and clearly state the immediate justification for that step (e.g., "Plan: drafting the chart creation steps").
- The plan_state_update payload must include \`planId\`, \`currentStepId\`, and a comprehensive \`steps\` array where each entry has \`intent\` and \`status\` (\`ready\`|\`in_progress\`|\`done\`).
- Emit exactly **one** action (the plan_state_update). **Do NOT** include \`text_response\`; the host UI will provide any greeting copy.
- If the user's latest message is merely a greeting or check-in (e.g., "hi", "hello there", "早安"), still include a first nextSteps entry with id "acknowledge_user" and a label that confirms you will greet/clarify with them before moving to data work.
- Keep nextSteps focused on the minimum set of concrete moves (e.g., build chart, run filter, gather clarification). Reference dataset columns exactly as they appear.
- Return **raw JSON only** (no Markdown fences/backticks, no commentary) and only include the fields described above—do not invent extra keys.
- Never wrap the JSON in \`\`\` \`\`\` or prepend/append explanatory text; the response must begin with \u007B and end with \u007D.
`.trim();

    const conversation = `
Recent conversation (last ${Math.min(chatHistory.length, 5)} turn${Math.min(chatHistory.length, 5) === 1 ? '' : 's'}):
${recentHistory}
`.trim();

    const latestRequest = `
The user's latest request is: "${userPrompt}"

Output your answer as a JSON object with an "actions" array. Remember: stay in planning mode only; do not issue executions until the goal tracker is established.
`.trim();

    const sections: PromptSection[] = [
        { label: 'Instructions', content: instructions, required: true, priority: 0, stage: 'seed' },
        { label: 'Recent conversation', content: conversation, priority: 1, stage: 'conversation' },
        { label: 'Latest request', content: latestRequest, required: true, priority: 2, stage: 'action' },
    ];

    const { prompt, trimmedSections } = composePromptWithBudget(sections);
    if (trimmedSections.length > 0 && typeof console !== 'undefined') {
        console.info('[promptBudget] Plan primer trimmed sections:', trimmedSections);
    }
    return prompt;
};

const buildChatPromptSections = (
    columns: ColumnProfile[],
    chatHistory: ChatMessage[],
    userPrompt: string,
    cardContext: CardContext[],
    language: Settings['language'],
    aiCoreAnalysisSummary: string | null,
    longTermMemory: string[],
    recentObservations: AgentObservation[],
    planState: AgentPlanState | null,
    dataPreparationPlan: DataPreparationPlan | null,
    recentActionTraces: AgentActionTrace[],
    rawDataFilterSummary: string,
): PromptSection[] => {
    const recentHistory = formatConversationChunk(chatHistory, 5);
    const actionTraceHistory =
        recentActionTraces.length > 0
            ? recentActionTraces
                  .slice(-5)
                  .map(trace => `- [${trace.source}/${trace.status.toUpperCase()}] ${trace.actionType}: ${trace.summary}${trace.details ? ` (${trace.details})` : ''}`)
                  .join('\n')
            : 'No prior tool actions have been recorded yet. You are starting fresh. Always observe before acting.';
    const actionTraceSummary = `${actionTraceHistory}\n- [DATA_VIEW] Raw Data Explorer filter: ${rawDataFilterSummary}`;
    const observationSummary =
        recentObservations.length > 0
            ? recentObservations
                  .slice(-5)
                  .map(obs => {
                      const detail = obs.outputs ? JSON.stringify(obs.outputs).slice(0, 160) : 'No structured output reported.';
                      return `- [${obs.status.toUpperCase()}] ${obs.responseType} (action ${obs.actionId.slice(-6)}): ${detail}`;
                  })
                  .join('\n')
            : 'No runtime observations captured yet for this session.';
    const planStateSummary = planState
        ? `Goal: ${planState.goal}\nContext: ${planState.contextSummary || '—'}\nProgress: ${planState.progress}\nNext Steps:\n${planState.nextSteps
              .map((step, idx) => `  ${idx + 1}. [${step.id}] ${step.label}`)
              .join('\n')}\nBlocked By: ${planState.blockedBy || 'Nothing reported.'}\nConfidence: ${
              typeof planState.confidence === 'number' ? planState.confidence.toFixed(2) : 'Not provided'
          }\nReferenced Observations: ${
              planState.observationIds && planState.observationIds.length > 0
                  ? planState.observationIds.join(', ')
                  : 'None specified.'
          }`
        : 'No structured goal has been recorded yet. Your first action must be a plan_state_update that defines a clear goal, ties it to current data, and lists concrete next steps.';

    const columnSection =
        columns.length > 0
            ? `Column inventory (${columns.length} total, showing up to 10): ${columns
                  .slice(0, 10)
                  .map(col => `${col.name} (${col.type})`)
                  .join(', ')}`
            : 'No columns detected.';
    const cardSection =
        cardContext.length > 0
            ? `Existing cards (${cardContext.length} total, showing up to 4):\n${cardContext
                  .slice(0, 4)
                  .map(card => `- ${card.title}${card.chartType ? ` (${card.chartType})` : ''}`)
                  .join('\n')}`
            : 'No analysis cards visible yet.';
    const briefingSection = `Core analysis briefing:\n${aiCoreAnalysisSummary || 'Not generated yet.'}`;
    const dataPrepSection = dataPreparationPlan
        ? `Data preparation log:\nExplanation: ${dataPreparationPlan.explanation}\nCode:\n${dataPreparationPlan.jsFunctionBody}`
        : 'No AI-driven data preparation was performed.';
    const memorySection =
        longTermMemory.length > 0
            ? `Long-term memory (top ${Math.min(longTermMemory.length, 3)}):\n${longTermMemory.slice(0, 3).join('\n---\n')}`
            : 'No relevant long-term memories.';
    const instructions = `
You are an expert data analyst and strategist operating with a Reason-Act (ReAct) framework. Every action needs a short reason first, then the action payload. Keep final conversational replies in ${language}.
`.trim();

const planProtocol = `
PLAN TRACKER PROTOCOL (Follow exactly):
- Every action JSON must include \`type\`, \`responseType\`, and \`stepId\`. The host app will supply timestamps/stateTags after validation.
- \`plan_state_update\` entries must list \`nextSteps\` objects (id + label) and a \`steps\` array including \`intent\` + \`status\`.
- Emit at most two actions per turn (plan_state_update + one atomic action). Reasons ≤280 chars referencing the plan step.
- Use \`await_user\` when the user must choose; include numbered options and set \`meta.awaitUser=true\`.
- For \`dom_action\`, always specify \`domAction.target\`. If the target is unknown, fall back to a text_response asking the user.
- When blocked, set \`plan_state_update.blockedBy\` to the waiting label (e.g., "awaiting_clarification").
- Structured tool intents must be placed in \`intentContract\` (object with \`intent\`, \`tool\`, \`args\`, \`awaitUser\`, \`message\`). Supported tools: csv.aggregate, csv.profile, csv.clean_invoice_month, csv.detect_outliers, ui.remove_card, idb.save_view. For ask_clarify set \`tool=null\` and \`awaitUser=true\`. Default aggregation "sum" and groupBy [] when unspecified.
`.trim();

    const analysisBriefing = `
CORE ANALYSIS BRIEFING:
${aiCoreAnalysisSummary || 'No core analysis has been performed yet.'}
`.trim();

    const prepLog = `
DATA PREPARATION LOG:
${dataPreparationPlan ? `Explanation: ${dataPreparationPlan.explanation}\nCode:\n${dataPreparationPlan.jsFunctionBody}` : 'No AI-driven data preparation was performed.'}
`.trim();

    const memoryBlock = `
LONG-TERM MEMORY:
${longTermMemory.length > 0 ? longTermMemory.join('\n---\n') : 'No specific long-term memories are relevant.'}
`.trim();

    const planStateBlock = `
AGENT PLAN STATE:
${planStateSummary}
`.trim();

    const cardSummaries =
        cardContext.length > 0
            ? cardContext
                  .slice(0, 6)
                  .map(card => `  - ${card.title}${card.chartType ? ` (${card.chartType})` : ''}`)
                  .join('\n')
            : '  - No analysis cards yet.';
    const runtimeNotes = `
Agent runtime notes:
- Pipeline: Context Builder → Planner → Action Dispatcher. Keep plans concise for downstream executors.
`.trim();

    const actionBlock = `
Recent tool actions:
${actionTraceSummary}
`.trim();

    const observationBlock = `
Runtime observations (latest up to 5):
${observationSummary}
`.trim();

    const conversationBlock = `
Recent conversation:
${recentHistory || 'No prior conversation.'}
`.trim();

    const userRequestBlock = `
Latest user message: "${userPrompt}"

Respond with a JSON object containing an "actions" array. Example (pseudocode):
{
  "actions": [
    { "type": "plan_state_update", ... },
    { "type": "text_response", ... }
  ]
}

Primary actions available: text_response, plan_creation, dom_action, execute_js_code, clarification_request, await_user, filter_spreadsheet, proceed_to_analysis. Always acknowledge the user via text_response when you finish a complex step.
- Output raw JSON only (no Markdown fences/backticks). Stick to the documented fields; do not add extra keys or prose outside the JSON object.
- The response must start with \u007B and end with \u007D—no greetings or commentary outside the JSON.
`.trim();

    return [
        { label: 'Seed instructions', content: instructions, required: true, priority: 0, stage: 'seed' },
        { label: 'Plan protocol', content: planProtocol, required: true, priority: 1, stage: 'seed' },
        { label: 'Conversation', content: conversationBlock, priority: 2, stage: 'conversation' },
        { label: 'Context: columns', content: columnSection, priority: 3, stage: 'context' },
        { label: 'Context: cards', content: cardSection, priority: 3, stage: 'context' },
        { label: 'Context: analysis briefing', content: briefingSection, priority: 4, stage: 'context' },
        { label: 'Context: data prep', content: dataPrepSection, priority: 4, stage: 'context' },
        { label: 'Context: long-term memory', content: memorySection, priority: 5, stage: 'context' },
        { label: 'Context: plan state', content: planStateBlock, priority: 5, stage: 'context' },
        { label: 'Context: runtime notes', content: runtimeNotes, priority: 7, stage: 'context' },
        { label: 'Context: action traces', content: actionBlock, priority: 7, stage: 'context' },
        { label: 'Context: observations', content: observationBlock, priority: 7, stage: 'context' },
        { label: 'Action / user request', content: userRequestBlock, required: true, priority: 8, stage: 'action' },
    ];
};

export const createChatPrompt = (
    columns: ColumnProfile[],
    chatHistory: ChatMessage[],
    userPrompt: string,
    cardContext: CardContext[],
    language: Settings['language'],
    aiCoreAnalysisSummary: string | null,
    longTermMemory: string[],
    recentObservations: AgentObservation[],
    planState: AgentPlanState | null,
    dataPreparationPlan: DataPreparationPlan | null,
    recentActionTraces: AgentActionTrace[],
    rawDataFilterSummary: string,
): string => {
    const sections = buildChatPromptSections(
        columns,
        chatHistory,
        userPrompt,
        cardContext,
        language,
        aiCoreAnalysisSummary,
        longTermMemory,
        recentObservations,
        planState,
        dataPreparationPlan,
        recentActionTraces,
        rawDataFilterSummary,
    );

    const { prompt, trimmedSections } = composePromptWithBudget(sections);
    if (trimmedSections.length > 0 && typeof console !== 'undefined') {
        console.info('[promptBudget] Chat prompt trimmed sections:', trimmedSections);
    }
    return prompt;
};

export const createChatPromptForStage = (
    stage: PromptStage,
    columns: ColumnProfile[],
    chatHistory: ChatMessage[],
    userPrompt: string,
    cardContext: CardContext[],
    language: Settings['language'],
    aiCoreAnalysisSummary: string | null,
    longTermMemory: string[],
    recentObservations: AgentObservation[],
    planState: AgentPlanState | null,
    dataPreparationPlan: DataPreparationPlan | null,
    recentActionTraces: AgentActionTrace[],
    rawDataFilterSummary: string,
): string => {
    const sections = buildChatPromptSections(
        columns,
        chatHistory,
        userPrompt,
        cardContext,
        language,
        aiCoreAnalysisSummary,
        longTermMemory,
        recentObservations,
        planState,
        dataPreparationPlan,
        recentActionTraces,
        rawDataFilterSummary,
    );
    return composePromptWithBudget(sections, undefined, {
        includeTrimNote: false,
        stageFilter: stage,
    }).prompt;
};
