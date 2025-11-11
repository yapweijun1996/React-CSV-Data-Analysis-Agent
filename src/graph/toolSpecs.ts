import type { GraphToolCall } from '@/types';

export interface GraphToolPlanSpec {
    toolCall: GraphToolCall;
    stepId: string;
    stepLabel: string;
    stepIntent: string;
    planGoal: string;
    planProgress: string;
    reason: string;
    text: string;
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
    },
};

export const getGraphToolSpec = (optionId?: string | null): GraphToolPlanSpec | undefined =>
    optionId ? GRAPH_TOOL_SPECS[optionId] : undefined;

export const isGraphToolOption = (optionId?: string | null): boolean => Boolean(getGraphToolSpec(optionId));
