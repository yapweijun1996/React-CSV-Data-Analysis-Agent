import React, { useMemo } from 'react';
import { CsvRow } from '../types';
import { formatCellValue } from '../utils/formatCellValue';
import { robustParseFloat } from '../utils/dataProcessor';

interface DataTableProps {
    data: CsvRow[];
    schema?: Array<{ name: string; type: string }>;
}

const NUMERIC_TYPES = new Set(['number', 'currency', 'percentage']);

export const DataTable: React.FC<DataTableProps> = ({ data, schema }) => {
    if (!data || data.length === 0) {
        return <p className="text-slate-500">No data to display.</p>;
    }

    const headers = schema?.map(col => col.name) ?? Object.keys(data[0]);
    const headerTypeMap = useMemo(() => {
        if (!schema) return new Map<string, string>();
        const map = new Map<string, string>();
        schema.forEach(col => map.set(col.name, col.type));
        return map;
    }, [schema]);
    const primaryNumericHeader = useMemo(() => {
        for (const header of headers) {
            const type = (headerTypeMap.get(header) ?? '').toLowerCase();
            if (NUMERIC_TYPES.has(type)) {
                return header;
            }
        }
        return null;
    }, [headers, headerTypeMap]);

    const sortedData = useMemo(() => {
        if (!primaryNumericHeader) return data;
        return [...data].sort((a, b) => {
            const av = robustParseFloat(a[primaryNumericHeader]);
            const bv = robustParseFloat(b[primaryNumericHeader]);
            if (av === bv) return 0;
            if (av === null || av === undefined) return 1;
            if (bv === null || bv === undefined) return -1;
            return bv - av;
        });
    }, [data, primaryNumericHeader]);
    
    return (
        <div className="w-full text-sm">
            <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600">
                    <tr>
                        {headers.map(header => (
                            <th key={header} className="p-2 font-semibold">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {sortedData.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-slate-200 last:border-b-0">
                            {headers.map(header => (
                                <td key={`${rowIndex}-${header}`} className="p-2 text-slate-700">
                                    {formatCellValue(row[header], 0, headerTypeMap.get(header))}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
