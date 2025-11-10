export type CsvRow = { [key: string]: string | number };

// Changed from CsvRow[] to an object to include filename metadata
export interface CsvData {
    fileName: string;
    data: CsvRow[];
}

export interface ExternalCsvPayload {
    csv: string;
    header?: string;
    fileName?: string;
    receivedAt?: number;
}

export interface ColumnProfile {
    name: string;
    type: 'numerical' | 'categorical' | 'date' | 'time' | 'currency' | 'percentage';
    uniqueValues?: number;
    valueRange?: [number, number];
    missingPercentage?: number;
}

export interface DataTransformMeta {
    rowsBefore: number;
    rowsAfter: number;
    addedRows: number;
    removedRows: number;
    modifiedRows: number;
}

export interface SelectionDrilldownFilter {
    sourceCardId: string;
    column: string;
    values: (string | number)[];
    label: string;
    createdAt: string;
}

export interface AnalysisPlanRowFilter {
    column: string;
    values: (string | number)[];
}

export interface PendingDataTransform {
    id: string;
    summary: string;
    explanation?: string;
    meta: DataTransformMeta;
    previewRows: CsvRow[];
    nextData: CsvData;
    nextColumnProfiles: ColumnProfile[];
    nextAliasMap: Record<string, string>;
    sourceCode?: string;
    createdAt: string;
}

export interface AppliedDataTransformRecord {
    id: string;
    summary: string;
    explanation?: string;
    meta: DataTransformMeta;
    previousData: CsvData | null;
    previousColumnProfiles: ColumnProfile[];
    previousAliasMap: Record<string, string>;
    appliedAt: string;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'combo';
export type AggregationType = 'sum' | 'count' | 'avg';

export type AgentActionType =
    | 'plan_creation'
    | 'text_response'
    | 'dom_action'
    | 'execute_js_code'
    | 'proceed_to_analysis'
    | 'filter_spreadsheet'
    | 'clarification_request'
    | 'plan_state_update';
export type AgentActionStatus = 'observing' | 'executing' | 'succeeded' | 'failed';
export type AgentActionSource = 'chat' | 'pipeline' | 'system';

export const AGENT_STATE_TAGS = [
    'context_ready',
    'needs_clarification',
    'transform_drafted',
    'analysis_shared',
    'awaiting_data',
    'error_retrying',
] as const;

export type AgentStateTag = typeof AGENT_STATE_TAGS[number];

export const AGENT_PHASES = [
    'idle',
    'observing',
    'planning',
    'acting',
    'verifying',
    'reporting',
    'clarifying',
    'retrying',
] as const;

export type AgentPhase = typeof AGENT_PHASES[number];

export interface AgentPhaseState {
    phase: AgentPhase;
    message: string | null;
    enteredAt: string | null;
}

export interface AgentActionTrace {
    id: string;
    actionType: AgentActionType;
    status: AgentActionStatus;
    summary: string;
    details?: string;
    timestamp: Date;
    source: AgentActionSource;
    durationMs?: number;
    errorCode?: string;
    metadata?: Record<string, any>;
}

export type AgentObservationStatus = 'success' | 'error' | 'pending';

export interface AgentObservation {
    id: string;
    actionId: string;
    responseType: AgentActionType;
    status: AgentObservationStatus;
    timestamp: string;
    outputs?: Record<string, any> | null;
    errorCode?: string | null;
    uiDelta?: string | null;
}

export interface AgentValidationEvent {
    id: string;
    actionType: AgentActionType;
    reason: string;
    actionIndex: number;
    timestamp: string;
    runId?: string | null;
    retryInstruction?: string;
}

export interface AgentPlanStep {
    id: string;
    label: string;
}

export interface AgentPlanState {
    goal: string;
    contextSummary?: string | null;
    progress: string;
    nextSteps: AgentPlanStep[];
    blockedBy?: string | null;
    observationIds?: string[];
    confidence?: number | null;
    updatedAt: string;
}

export interface PlannerSessionState {
    observations: AgentObservation[];
    planState: AgentPlanState | null;
}

export interface AnalysisPlan {
    chartType: ChartType;
    title: string;
    description: string;
    aggregation?: AggregationType; // Optional for scatter plots
    groupByColumn?: string; // Optional for scatter plots
    valueColumn?: string; // Optional for 'count' aggregation
    xValueColumn?: string; // For scatter plots
    yValueColumn?: string; // For scatter plots
    secondaryValueColumn?: string; // For combo charts
    secondaryAggregation?: AggregationType; // For combo charts
    defaultTopN?: number; // Suggested Top N for charts with many categories
    defaultHideOthers?: boolean; // Suggestion for hiding 'Others' in Top N
    rowFilter?: AnalysisPlanRowFilter; // Optional row-level filter before aggregation
}

export interface AnalysisCardData {
    id: string;
    plan: AnalysisPlan;
    aggregatedData: CsvRow[];
    summary: string;
    displayChartType: ChartType;
    isDataVisible: boolean;
    topN: number | null; // For Top N filtering
    hideOthers: boolean; // For hiding the 'Others' category in Top N
    disableAnimation?: boolean; // To control loading animations
    filter?: { column: string; values: (string | number)[] }; // For interactive filtering by the AI
    hiddenLabels?: string[]; // For interactive legend visibility
}

export interface ProgressMessage {
    text: string;
    type: 'system' | 'error';
    timestamp: Date;
}

// A plan that might have placeholders for the AI to fill in after clarification.
export type PendingPlan = Partial<AnalysisPlan> & { [key: string]: any; };

export interface ClarificationOption {
    label: string; // "Sales in USD"
    value: string; // "Sales_USD"
}

export type ClarificationStatus = 'pending' | 'resolving' | 'resolved' | 'skipped';

export interface ClarificationRequestPayload {
    question: string;
    options: ClarificationOption[];
    // The plan that is waiting for the user's input.
    pendingPlan: PendingPlan;
    // We need to know which property of the plan the user's choice will fill.
    targetProperty: keyof AnalysisPlan;
    columnHints?: string[];
}

export interface ClarificationRequest extends ClarificationRequestPayload {
    id: string;
    status: ClarificationStatus;
}

export interface MemoryReference {
    id: string;
    text: string;
    score?: number;
}

export interface ChatMessage {
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
    type?: 'user_message' | 'ai_message' | 'ai_thinking' | 'ai_proactive_insight' | 'ai_plan_start' | 'ai_clarification'; // New field for special message types
    isError?: boolean; // To style error messages in the chat
    cardId?: string; // ID of the card this message refers to
    clarificationRequest?: ClarificationRequest; // Attach the request to the message
    cta?: {
        type: 'open_data_preview';
        label: string;
        helperText?: string;
    };
    usedMemories?: MemoryReference[]; // Snapshot of memories that informed this response
}

export interface Settings {
    provider: 'google' | 'openai';
    geminiApiKey: string;
    openAIApiKey: string;
    model: string;
    language: 'English' | 'Mandarin' | 'Spanish' | 'Japanese' | 'French';
    autoSaveEnabled: boolean;
    autoSaveIntervalSeconds: number;
}

export type AppView = 'file_upload' | 'analysis_dashboard';

export interface AppState {
    currentView: AppView;
    isBusy: boolean;
    busyMessage: string | null;
    canCancelBusy: boolean;
    progressMessages: ProgressMessage[];
    csvData: CsvData | null;
    columnProfiles: ColumnProfile[];
    analysisCards: AnalysisCardData[];
    chatHistory: ChatMessage[];
    finalSummary: string | null;
    aiCoreAnalysisSummary: string | null; // AI's internal monologue/memory about the dataset
    dataPreparationPlan: DataPreparationPlan | null; // The plan used to clean the data
    initialDataSample: CsvRow[] | null; // Snapshot of raw data for debug view
    datasetHash: string | null; // Fingerprint of the current dataset for memory gating
    vectorStoreDocuments: VectorStoreDocument[]; // For persisting AI memory
    spreadsheetFilterFunction: string | null; // For AI-powered spreadsheet filtering
    aiFilterExplanation: string | null; // Explanation for the AI filter
    pendingClarifications: ClarificationRequest[]; // For the clarification loop
    activeClarificationId: string | null;
    toasts: AppToast[];
    agentActionTraces: AgentActionTrace[];
    agentValidationEvents: AgentValidationEvent[];
    columnAliasMap: Record<string, string>;
    pendingDataTransform: PendingDataTransform | null;
    lastAppliedDataTransform: AppliedDataTransformRecord | null;
    isLastAppliedDataTransformBannerDismissed: boolean;
    interactiveSelectionFilter: SelectionDrilldownFilter | null;
    plannerSession: PlannerSessionState;
    agentPhase: AgentPhaseState;
    plannerPendingSteps: AgentPlanStep[];
}

export interface DomAction {
    toolName:
        | 'highlightCard'
        | 'changeCardChartType'
        | 'showCardData'
        | 'filterCard'
        | 'setTopN'
        | 'toggleHideOthers'
        | 'toggleLegendLabel'
        | 'exportCard';
    args: { [key: string]: any };
}

export interface AiAction {
  thought?: string; // The AI's reasoning for this action (ReAct pattern).
  responseType: AgentActionType;
  stateTag?: AgentStateTag;
  stepId?: string | null;
  plan?: AnalysisPlan;
  text?: string;
  cardId?: string; // For text_response, the ID of the card being discussed
  domAction?: DomAction;
  code?: {
    explanation: string;
    jsFunctionBody: string;
  };
  args?: { // For actions like filter_spreadsheet
    query?: string | null;
  };
  clarification?: ClarificationRequestPayload;
  planState?: AgentPlanState;
}

export interface AiChatResponse {
    actions: AiAction[];
}

export interface DataPreparationPlan {
    explanation: string;
    jsFunctionBody: string | null;
    // CRITICAL FIX: The AI must now define the output schema of its own transformation.
    outputColumns: ColumnProfile[];
}

// For Session History
export interface Report {
    id: string;
    filename: string;
    createdAt: Date;
    updatedAt: Date;
    appState: AppState;
}

export interface ReportListItem {
    id: string;
    filename: string;
    createdAt: Date;
    updatedAt: Date;
}

// For providing richer context to the AI
export interface CardContext {
    id: string;
    title: string;
    aggregatedDataSample: CsvRow[];
}

// For Long-Term Memory / Vector Store
export interface VectorStoreDocument {
    id: string;
    text: string;
    embedding: number[];
    metadata?: Record<string, any>;
}

// For interactive spreadsheet sorting
export interface SortConfig {
    key: string;
    direction: 'ascending' | 'descending';
}

// For AI spreadsheet filtering
export interface AiFilterResponse {
    explanation: string;
    jsFunctionBody: string;
}

export interface AppToast {
    id: string;
    type: 'info' | 'success' | 'error';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}
