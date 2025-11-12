import type { GraphToolCall } from '@/types';
import { normalizeIntentContract } from '@/services/ai/intentContract';
import type { IntentContract } from '@/services/ai/intentContract';

export interface GraphToolPlanSpecMetadataOverrides {
    toolCall?: GraphToolCall;
    stepLabel?: string;
    planGoal?: string;
    planProgress?: string;
    reason?: string;
    text?: string;
    intentContract?: IntentContract;
}

export interface GraphToolPlanSpec {
   toolCall: GraphToolCall;
   stepId: string;
   stepLabel: string;
   stepIntent: string;
   planGoal: string;
   planProgress: string;
   reason: string;
   text: string;
   intentContract?: IntentContract;
   applyMetadata?: (metadata: Record<string, unknown>) => GraphToolPlanSpecMetadataOverrides;
}

export const GRAPH_TOOL_SPECS: Record<string, GraphToolPlanSpec | undefined> = {
    clean_month: {
        toolCall: { kind: 'normalize_invoice_month', params: { column: 'InvoiceMonth' } },
        stepId: 'normalize-invoice-month',
        stepLabel: '标准化 InvoiceMonth 字段',
        stepIntent: 'data_cleaning',
        planGoal: '标准化发票月份字段，确保后续聚合一致。',
        planProgress: '已进入 InvoiceMonth 字段标准化阶段。',
        reason: '根据你的选择，先统一 InvoiceMonth 字段格式。',
        text: '正在本地标准化 InvoiceMonth 字段（YYYY-MM），完成后我会告知影响行数。',
        intentContract: normalizeIntentContract({
            intent: 'clean',
            tool: 'csv.clean_invoice_month',
            args: { column: 'InvoiceMonth' },
        }),
        applyMetadata: metadata => {
            const column =
                typeof metadata.column === 'string' && metadata.column.trim().length
                    ? metadata.column
                    : 'InvoiceMonth';
            return {
                toolCall: { kind: 'normalize_invoice_month', params: { column } },
                stepLabel: `标准化 ${column} 字段`,
                planGoal: `标准化 ${column} 字段，确保后续聚合一致。`,
                planProgress: `已进入 ${column} 字段标准化阶段。`,
                reason: `根据你的选择，先统一 ${column} 字段格式。`,
                text: `正在本地标准化 ${column} 字段（YYYY-MM），完成后我会告知影响行数。`,
                intentContract: normalizeIntentContract({
                    intent: 'clean',
                    tool: 'csv.clean_invoice_month',
                    args: { column },
                }),
            };
        },
    },
    outlier: {
        toolCall: { kind: 'detect_outliers', params: { valueColumn: 'Amount', multiplier: 3 } },
        stepId: 'detect-amount-outliers',
        stepLabel: '侦测金额异常值',
        stepIntent: 'data_validation',
        planGoal: '识别金额异常交易记录，提供可疑清单。',
        planProgress: '已开始金额异常检测（以 Amount 字段计算阈值）。',
        reason: '根据你的选择，先扫描金额异常值。',
        text: '正在比较 Amount 分布，找出超过阈值的可疑记录，稍后回报。',
        intentContract: normalizeIntentContract({
            intent: 'detect_anomaly',
            tool: 'csv.detect_outliers',
            args: { valueColumn: 'Amount', thresholdMultiplier: 3 },
        }),
        applyMetadata: metadata => {
            const valueColumn =
                typeof metadata.valueColumn === 'string' && metadata.valueColumn.trim().length
                    ? metadata.valueColumn
                    : 'Amount';
            return {
                toolCall: { kind: 'detect_outliers', params: { valueColumn, multiplier: 3 } },
                stepLabel: `侦测 ${valueColumn} 异常值`,
                planGoal: `识别 ${valueColumn} 异常交易记录，提供可疑清单。`,
                planProgress: `已开始 ${valueColumn} 异常检测（以 ${valueColumn} 字段计算阈值）。`,
                reason: `根据你的选择，先扫描 ${valueColumn} 异常值。`,
                text: `正在比较 ${valueColumn} 分布，找出超过阈值的可疑记录，稍后回报。`,
                intentContract: normalizeIntentContract({
                    intent: 'detect_anomaly',
                    tool: 'csv.detect_outliers',
                    args: { valueColumn, thresholdMultiplier: 3 },
                }),
            };
        },
    },
};

export const resolveGraphToolSpec = (
    optionId?: string | null,
    metadata?: Record<string, unknown> | null,
): GraphToolPlanSpec | undefined => {
    if (!optionId) return undefined;
    const base = GRAPH_TOOL_SPECS[optionId];
    if (!base) return undefined;
    const overrides = metadata && base.applyMetadata ? base.applyMetadata(metadata) : undefined;
    return {
        ...base,
        toolCall: overrides?.toolCall ?? base.toolCall,
        stepLabel: overrides?.stepLabel ?? base.stepLabel,
        planGoal: overrides?.planGoal ?? base.planGoal,
        planProgress: overrides?.planProgress ?? base.planProgress,
        reason: overrides?.reason ?? base.reason,
        text: overrides?.text ?? base.text,
        intentContract: overrides?.intentContract ?? base.intentContract,
    };
};

export const isGraphToolOption = (optionId?: string | null): boolean => Boolean(GRAPH_TOOL_SPECS[optionId ?? '']);
