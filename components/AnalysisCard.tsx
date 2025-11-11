import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { AnalysisPlanRowFilter, AnalysisCardData, AggregationMeta, ChartType, AnalysisPlan } from '../types';
import { ChartRenderer, ChartRendererHandle } from './ChartRenderer';
import { DataTable } from './DataTable';
import { exportToPng, exportToCsv, exportToHtml } from '../utils/exportUtils';
import { ChartTypeSwitcher } from './ChartTypeSwitcher';
import { applyTopNWithOthers } from '../utils/dataProcessor';
import { InteractiveLegend } from './InteractiveLegend';
import { useAppStore } from '../store/useAppStore';

interface AnalysisCardProps {
    cardId: string;
}

const ExportIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ResetZoomIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      <path d="M12.293 5.293a1 1 0 011.414 0l2 2a1 1 0 01-1.414 1.414L13 7.414V10a1 1 0 11-2 0V7.414l-1.293 1.293a1 1 0 01-1.414-1.414l2-2zM7.707 14.707a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L7 12.586V10a1 1 0 112 0v2.586l1.293-1.293a1 1 0 011.414 1.414l-2 2z" />
    </svg>
);

const ClearSelectionIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const WarningIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.721-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.987-1.743 2.987H3.482c-1.53 0-2.493-1.653-1.743-2.987l6.518-11.59zM10 7a1 1 0 00-1 1v3.25a1 1 0 002 0V8a1 1 0 00-1-1zm0 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0010 15z" clipRule="evenodd" />
    </svg>
);

const formatDuration = (ms?: number) => {
    if (typeof ms !== 'number' || Number.isNaN(ms)) return null;
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
};

const formatTimestamp = (iso?: string) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString();
};

const AggregationStatusBanner: React.FC<{
    meta?: AggregationMeta;
    onRunFullScan?: () => Promise<void> | void;
    isRefreshing?: boolean;
}> = ({ meta, onRunFullScan, isRefreshing }) => {
    if (!meta) {
        return null;
    }
    const sampled = meta.sampled;
    const badgeStyles = sampled
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200';
    const statusLabel = sampled ? 'Sampled result' : 'Full scan';
    const processedLabel = sampled
        ? `${meta.processedRows.toLocaleString()} of ${meta.totalRows.toLocaleString()} rows`
        : `${meta.totalRows.toLocaleString()} rows`;
    const durationLabel = formatDuration(meta.durationMs);
    const lastRunLabel = formatTimestamp(meta.lastRunAt);
    const warnings = meta.warnings?.filter(Boolean) ?? [];

    return (
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles}`}>
                    {statusLabel}
                </span>
                <span>{processedLabel}</span>
                {durationLabel && <span className="text-slate-400">·</span>}
                {durationLabel && <span>{durationLabel}</span>}
                {lastRunLabel && (
                    <>
                        <span className="text-slate-400">·</span>
                        <span>Last run {lastRunLabel}</span>
                    </>
                )}
                {sampled && (
                    <>
                        <span className="text-slate-400">·</span>
                        <span className="text-xs text-slate-500">
                            Showing a quick preview. Full scan processes every row.
                        </span>
                    </>
                )}
                {sampled && onRunFullScan && (
                    <button
                        type="button"
                        onClick={() => onRunFullScan()}
                        disabled={isRefreshing}
                        className="ml-auto inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                        {isRefreshing ? 'Running…' : 'Run full scan'}
                    </button>
                )}
            </div>
            {warnings.length > 0 && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-700">
                    <WarningIcon />
                    <span className="flex-1">{warnings.join(' • ')}</span>
                </div>
            )}
        </div>
    );
};

const AggregationMetaFooter: React.FC<{ meta?: AggregationMeta; plan: AnalysisPlan }> = ({ meta, plan }) => {
    if (!meta) return null;
    const rowsLabel = `${meta.processedRows.toLocaleString()} / ${meta.totalRows.toLocaleString()}`;
    const filterLabel =
        meta.filterCount && meta.filterCount > 0
            ? `${meta.filterCount} ${meta.filterCount === 1 ? 'filter' : 'filters'} applied`
            : 'No filters applied';
    const orderSummary =
        plan.orderBy && plan.orderBy.length > 0
            ? plan.orderBy
                  .map(order => `${order.column} ${(order.direction ?? 'desc').toUpperCase()}`)
                  .join(', ')
            : plan.chartType === 'line' && plan.groupByColumn
            ? `${plan.groupByColumn} ASC`
            : `${plan.valueColumn ?? 'count'} DESC`;
    const limitLabel =
        typeof plan.limit === 'number'
            ? `${plan.limit.toLocaleString()} rows`
            : plan.defaultTopN
            ? `${plan.defaultTopN.toLocaleString()} rows (default)`
            : 'All rows';

    return (
        <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                <div>
                    <span className="text-slate-400">Rows processed</span>
                    <span className="ml-1 font-semibold text-slate-700">{rowsLabel}</span>
                </div>
                <div>
                    <span className="text-slate-400">Filters</span>
                    <span className="ml-1 text-slate-700">{filterLabel}</span>
                </div>
                <div>
                    <span className="text-slate-400">Order</span>
                    <span className="ml-1 text-slate-700">{orderSummary}</span>
                </div>
                <div>
                    <span className="text-slate-400">Limit</span>
                    <span className="ml-1 text-slate-700">{limitLabel}</span>
                </div>
            </div>
        </div>
    );
};

const RowFilterBadge: React.FC<{ filter: AnalysisPlanRowFilter }> = ({ filter }) => {
    const MAX_VALUES_PREVIEW = 3;
    const preview = filter.values.slice(0, MAX_VALUES_PREVIEW).map(value => String(value)).join(', ');
    const remaining = filter.values.length - MAX_VALUES_PREVIEW;
    const display = remaining > 0 ? `${preview} +${remaining}` : preview;
    const tooltip = `Rows limited to ${filter.column} → ${filter.values.map(value => String(value)).join(', ')}`;
    return (
        <span
            className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200"
            title={tooltip}
        >
            Filtered · {filter.column}: {display}
        </span>
    );
};


export const AnalysisCard: React.FC<AnalysisCardProps> = ({ cardId }) => {
    const cardData = useAppStore(state => state.analysisCards.find(c => c.id === cardId));
    const { 
        handleChartTypeChange, 
        handleToggleDataVisibility, 
        handleTopNChange, 
        handleHideOthersChange, 
        handleToggleLegendLabel,
        rerunAggregationForCard,
        linkChartSelectionToRawData,
        clearCardFilter,
    } = useAppStore(state => ({
        handleChartTypeChange: state.handleChartTypeChange,
        handleToggleDataVisibility: state.handleToggleDataVisibility,
        handleTopNChange: state.handleTopNChange,
        handleHideOthersChange: state.handleHideOthersChange,
        handleToggleLegendLabel: state.handleToggleLegendLabel,
        rerunAggregationForCard: state.rerunAggregationForCard,
        linkChartSelectionToRawData: state.linkChartSelectionToRawData,
        clearCardFilter: state.clearCardFilter,
    }));

    const cardRef = useRef<HTMLDivElement>(null);
    const chartRendererRef = useRef<ChartRendererHandle>(null);

    const [isExporting, setIsExporting] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [isZoomed, setIsZoomed] = useState(false);
    const [showSelectionDetails, setShowSelectionDetails] = useState(true);
    const [isAggRefreshing, setIsAggRefreshing] = useState(false);
    
    // If cardData is not found (e.g., during a state update), render nothing to avoid errors.
    if (!cardData) {
        return null;
    }

    const { id, plan, aggregatedData, summary, displayChartType, isDataVisible, topN, hideOthers, disableAnimation, filter, hiddenLabels = [], aggregationMeta } = cardData;

    const summaryParts = summary.split('---');
    const englishSummary = summaryParts[0]?.trim();
    const mandarinSummary = summaryParts[1]?.trim();

    const valueKey = plan.valueColumn || 'count';
    const groupByKey = plan.groupByColumn || '';

    const dataAfterFilter = useMemo(() => {
        let data = aggregatedData;
        if (filter && filter.column && filter.values.length > 0) {
            data = data.filter(row => filter.values.includes(row[filter.column]));
        }
        return data;
    }, [aggregatedData, filter]);

    const dataForLegend = useMemo(() => {
        if (plan.chartType !== 'scatter' && groupByKey && topN) {
            return applyTopNWithOthers(dataAfterFilter, groupByKey, valueKey, topN);
        }
        return dataAfterFilter;
    }, [dataAfterFilter, plan.chartType, groupByKey, topN, valueKey]);

    const dataForDisplay = useMemo(() => {
        let data = dataForLegend;
        if (topN && hideOthers) {
            data = data.filter(row => row[groupByKey] !== 'Others');
        }
        if (groupByKey) {
            data = data.filter(row => !hiddenLabels.includes(String(row[groupByKey])));
        }
        return data;
    }, [dataForLegend, topN, hideOthers, groupByKey, hiddenLabels]);

    const totalValue = useMemo(() => {
        return dataAfterFilter.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0);
    }, [dataAfterFilter, valueKey]);


    const handleExport = async (format: 'png' | 'csv' | 'html') => {
        if (!cardRef.current) return;
        setIsExporting(true);
        try {
            switch(format) {
                case 'png':
                    await exportToPng(cardRef.current, plan.title);
                    break;
                case 'csv':
                    exportToCsv(dataForDisplay, plan.title);
                    break;
                case 'html':
                    await exportToHtml(cardRef.current, plan.title, dataForDisplay, summary);
                    break;
            }
        } finally {
            setIsExporting(false);
        }
    };

    const handleChartClick = (index: number, event: MouseEvent) => {
        const isMultiSelect = event.ctrlKey || event.metaKey;
        setSelectedIndices(prev => {
            if (isMultiSelect) {
                const newSelection = prev.includes(index)
                    ? prev.filter(i => i !== index)
                    : [...prev, index];
                return newSelection.sort((a,b) => a-b);
            }
            return prev.includes(index) ? [] : [index];
        });
    };

    const handleResetZoom = () => chartRendererRef.current?.resetZoom();
    const clearSelection = () => setSelectedIndices([]);
    const onTopNChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value === 'all' ? null : parseInt(e.target.value, 10);
        handleTopNChange(id, value);
    };
    
    const selectedData = selectedIndices.map(index => dataForDisplay[index]);

    const handleRunFullScan = useCallback(async () => {
        if (!rerunAggregationForCard) return;
        setIsAggRefreshing(true);
        try {
            await rerunAggregationForCard(id, { mode: 'full', allowFullScan: true });
        } finally {
            setIsAggRefreshing(false);
        }
    }, [id, rerunAggregationForCard]);

    useEffect(() => {
        if (!groupByKey || selectedIndices.length === 0) {
            linkChartSelectionToRawData(id, null, [], plan.title);
            return;
        }
        const values = selectedIndices
            .map(index => dataForDisplay[index]?.[groupByKey])
            .filter(value => value !== undefined && value !== null) as (string | number)[];
        if (values.length === 0) {
            linkChartSelectionToRawData(id, null, [], plan.title);
            return;
        }
        linkChartSelectionToRawData(id, groupByKey, values, plan.title);
        return () => {
            linkChartSelectionToRawData(id, null, [], plan.title);
        };
    }, [groupByKey, selectedIndices, dataForDisplay, id, linkChartSelectionToRawData, plan.title]);

    return (
        <div
            ref={cardRef}
            id={id}
            className="bg-white rounded-lg shadow-lg p-4 flex flex-col transition-all duration-300 hover:shadow-blue-500/20 border border-slate-200 w-full"
        >
            <div className="flex justify-between items-start gap-4 mb-2">
                <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{plan.title}</h3>
                        {plan.rowFilter && (
                            <RowFilterBadge filter={plan.rowFilter} />
                        )}
                    </div>
                </div>
                <div className="flex items-center bg-slate-100 rounded-md p-0.5 space-x-0.5 flex-shrink-0">
                    <ChartTypeSwitcher currentType={displayChartType} onChange={(newType) => handleChartTypeChange(id, newType)} />
                    <div className="relative group">
                        <button disabled={isExporting} className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md transition-colors hover:bg-slate-200">
                           <ExportIcon />
                        </button>
                        <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                            <a onClick={() => handleExport('png')} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer rounded-t-md">Export as PNG</a>
                            <a onClick={() => handleExport('csv')} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">Export as CSV</a>
                            <a onClick={() => handleExport('html')} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer rounded-b-md">Export as HTML</a>
                        </div>
                    </div>
                </div>
            </div>
            <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
            <AggregationStatusBanner
                meta={aggregationMeta}
                onRunFullScan={aggregationMeta?.sampled ? handleRunFullScan : undefined}
                isRefreshing={isAggRefreshing}
            />

            <div className="grid gap-4 flex-grow grid-cols-1">
                <div className="relative h-64">
                     <ChartRenderer 
                        ref={chartRendererRef}
                        chartType={displayChartType} 
                        data={dataForDisplay} 
                        plan={plan}
                        selectedIndices={selectedIndices}
                        onElementClick={handleChartClick}
                        onZoomChange={setIsZoomed}
                        disableAnimation={disableAnimation}
                    />
                     <div className="absolute top-1 right-1 flex items-center space-x-1">
                        {selectedIndices.length > 0 && (
                             <button onClick={clearSelection} title="Clear selection" className="p-1 bg-white/50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-slate-800 transition-all backdrop-blur-sm">
                                <ClearSelectionIcon />
                            </button>
                        )}
                        {isZoomed && (
                            <button onClick={handleResetZoom} title="Reset zoom" className="p-1 bg-white/50 text-slate-600 rounded-full hover:bg-slate-100 hover:text-slate-800 transition-all backdrop-blur-sm">
                                <ResetZoomIcon />
                            </button>
                        )}
                    </div>
                </div>
                {groupByKey && (
                    <div className="flex flex-col">
                        <InteractiveLegend 
                            data={dataForLegend}
                            total={totalValue}
                            groupByKey={groupByKey}
                            valueKey={valueKey}
                            hiddenLabels={hiddenLabels}
                            onLabelClick={(label) => handleToggleLegendLabel(id, label)}
                        />
                    </div>
                )}
            </div>
            
            {filter && (
                 <div className="text-xs text-yellow-800 bg-yellow-100 p-3 rounded-md my-3 border border-yellow-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                            <b>AI Filter Active:</b> Showing where '{filter.column}' is '{filter.values.join(', ')}'. Ask AI to "clear filter" or use the button to remove.
                        </span>
                        <button
                            type="button"
                            onClick={() => clearCardFilter(id)}
                            className="px-3 py-1 text-xs font-semibold text-yellow-900 bg-white/70 border border-yellow-300 rounded-md hover:bg-white hover:border-yellow-400 transition"
                        >
                            Clear filter
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="bg-slate-50 p-3 rounded-md text-sm border border-slate-200">
                    <div className="flex justify-between items-baseline mb-2">
                        <p className="font-semibold text-blue-600">AI Summary</p>
                        {plan.aggregation === 'sum' && (
                            <p className="text-xs text-slate-500">
                                Total: <span className="font-bold text-base text-slate-800">{totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            </p>
                        )}
                    </div>
                    <p className="text-slate-700 text-xs">{englishSummary}</p>
                    {mandarinSummary && <p className="text-slate-500 mt-2 text-xs">{mandarinSummary}</p>}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div>
                    <button onClick={() => handleToggleDataVisibility(id)} className="text-sm text-blue-600 hover:underline">
                        {isDataVisible ? 'Hide' : 'Show'} Full Data Table
                    </button>
                </div>
                {plan.chartType !== 'scatter' && aggregatedData.length > 5 && (
                    <div className="flex items-center space-x-2">
                        <label htmlFor={`top-n-${id}`} className="text-xs text-slate-500">Show</label>
                        <select
                            id={`top-n-${id}`}
                            value={topN || 'all'}
                            onChange={onTopNChange}
                            className="bg-white border border-slate-300 text-slate-800 text-xs rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">All</option>
                            <option value="5">Top 5</option>
                            <option value="8">Top 8</option>
                            <option value="10">Top 10</option>
                            <option value="15">Top 15</option>
                            <option value="20">Top 20</option>
                        </select>
                         {topN && (
                            <div className="flex items-center">
                                <label htmlFor={`hide-others-${id}`} className="flex items-center space-x-1.5 text-xs text-slate-500">
                                    <input
                                        type="checkbox"
                                        id={`hide-others-${id}`}
                                        checked={hideOthers}
                                        onChange={(e) => handleHideOthersChange(id, e.target.checked)}
                                        className="bg-slate-100 border-slate-300 rounded focus:ring-blue-500 text-blue-600 h-3.5 w-3.5"
                                    />
                                    <span>Hide "Others"</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedIndices.length > 0 && (
                <div className="mt-4 bg-slate-50 p-3 rounded-md text-sm border border-slate-200">
                     <button onClick={() => setShowSelectionDetails(!showSelectionDetails)} className="w-full text-left font-semibold text-blue-600 mb-1">
                        {showSelectionDetails ? '▾' : '▸'} Selection Details ({selectedIndices.length} items)
                    </button>
                    {showSelectionDetails && <DataTable data={selectedData} />}
                </div>
            )}
            
            {isDataVisible && (
                 <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-md">
                    <DataTable data={dataForDisplay} />
                </div>
            )}

            <AggregationMetaFooter meta={aggregationMeta} plan={plan} />
        </div>
    );
};
