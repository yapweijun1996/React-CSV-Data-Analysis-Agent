import React from 'react';
import { CsvRow } from '../types';
import { formatCellValue } from '../utils/formatCellValue';

interface DataTableProps {
    data: CsvRow[];
}

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-slate-500">No data to display.</p>;
    }

    const headers = Object.keys(data[0]);
    
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
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-slate-200 last:border-b-0">
                            {headers.map(header => (
                                <td key={`${rowIndex}-${header}`} className="p-2 text-slate-700">
                                    {formatCellValue(row[header])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
