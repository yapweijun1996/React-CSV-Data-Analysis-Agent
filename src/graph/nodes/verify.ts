import type { PipelineContext, NodeResult } from './types';
import type { AiAction } from '@/types';

export const verifyNode = ({ state }: PipelineContext): NodeResult => {
    const pendingVerification = state.pendingVerification;
    if (!pendingVerification) {
        return { state, actions: [], label: 'verify' };
    }
    const meta = pendingVerification.meta;
    const summaryParts: string[] = [];
    if (pendingVerification.summary) {
        summaryParts.push(pendingVerification.summary);
    } else if (meta) {
        if (meta.source) {
            summaryParts.push(`数据源：${meta.source === 'sample' ? '采样' : '全量'}`);
        }
        if (typeof meta.rows === 'number') {
            summaryParts.push(`记录数：${meta.rows}`);
        }
        if (typeof meta.processedRows === 'number' && typeof meta.totalRows === 'number') {
            summaryParts.push(`处理行：${meta.processedRows}/${meta.totalRows}`);
        }
        if (meta.warnings?.length) {
            summaryParts.push(`警告 ${meta.warnings.length} 条`);
        }
        if (meta.summary) {
            summaryParts.push(meta.summary);
        }
    }

    const describePayload = (): string | null => {
        const payload = pendingVerification.payload;
        if (!payload || typeof payload !== 'object') return null;
        const kind = typeof payload.kind === 'string' ? payload.kind : null;
        switch (kind) {
            case 'profile_dataset': {
                const columns = payload.columns as number | undefined;
                const rowCount = payload.rowCount as number | undefined;
                const sampledRows = payload.sampledRows as number | undefined;
                return `列画像：${columns ?? '?'} 列 · ${rowCount ?? '?'} 行（采样 ${sampledRows ?? '?'}）`;
            }
            case 'normalize_invoice_month': {
                const column = (payload.column as string) ?? 'InvoiceMonth';
                const normalized = payload.normalizedCount as number | undefined;
                const skipped = payload.skippedCount as number | undefined;
                return `标准化 ${column}：成功 ${normalized ?? 0}，跳过 ${skipped ?? 0}`;
            }
            case 'detect_outliers': {
                const column = (payload.column as string) ?? 'value';
                const count = payload.count as number | undefined;
                const threshold = payload.threshold as number | undefined;
                return `异常检测 ${column}：找到 ${count ?? 0} 条（阈值 ${threshold ?? '?'}）`;
            }
            case 'aggregate_plan': {
                const planTitle = (payload.planTitle as string) ?? pendingVerification.description;
                const rowCount = payload.rows as number | undefined;
                return `聚合视图「${planTitle}」产生 ${rowCount ?? 0} 行结果。`;
            }
            default:
                return null;
        }
    };

    const payloadSummary = describePayload();
    if (payloadSummary) {
        summaryParts.push(payloadSummary);
    }

    const verificationAction: AiAction = {
        type: 'text_response',
        responseType: 'text_response',
        stepId: pendingVerification.id,
        stateTag: `ts${Date.now().toString(36)}-verify`,
        timestamp: new Date().toISOString(),
        reason: '确认最新的聚合结果，并说明数据来源。',
        text: meta
            ? `已完成「${pendingVerification.description}」。\n${summaryParts.join(' · ')}`
            : `已完成「${pendingVerification.description}」的初步执行，准备生成可视化或进一步说明。`,
    };
    return {
        state: {
            ...state,
            pendingVerification: null,
        },
        actions: [verificationAction],
        label: 'verify',
    };
};
