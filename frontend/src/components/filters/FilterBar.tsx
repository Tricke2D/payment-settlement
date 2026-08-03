import React, { useState } from 'react';

interface FilterBarProps {
    onFilter: (filters: any) => void;
    onReset?: () => void;
    onExport?: () => void;
    onExportCSV?: () => void;
    loading?: boolean;
    statusOptions?: string[];
}

const FilterBar: React.FC<FilterBarProps> = ({
                                                 onFilter,
                                                 onExport,
                                                 onExportCSV,
                                                 loading = false,
                                                 statusOptions = ['all', 'pending', 'completed', 'failed', 'processing', 'phase_1_locked', 'rolled_back']
                                             }) => {
    const [filters, setFilters] = useState({
        status: 'all',
        search: '',
        dateFrom: '',
        dateTo: '',
    });

    const handleChange = (key: string, value: any) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onFilter(newFilters);
    };

    const handleReset = () => {
        const resetFilters = { status: 'all', search: '', dateFrom: '', dateTo: '' };
        setFilters(resetFilters);
        onFilter(resetFilters);
    };

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-md p-4 transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">🔍 Search</label>
                    <input
                        type="text"
                        placeholder="Search ID or seller..."
                        value={filters.search}
                        onChange={(e) => handleChange('search', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📊 Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {statusOptions.map((status) => (
                            <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date From */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📅 From</label>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => handleChange('dateFrom', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Date To */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">📅 To</label>
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => handleChange('dateTo', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                        Reset
                    </button>
                    {onExport && (
                        <button
                            onClick={onExport}
                            disabled={loading}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                            📥 Excel
                        </button>
                    )}
                    {onExportCSV && (
                        <button
                            onClick={onExportCSV}
                            disabled={loading}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            📄 CSV
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterBar;