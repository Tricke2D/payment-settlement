import React from 'react';
import { formatRupiah } from '../../utils/formatter';

interface StatsCardProps {
    title: string;
    count: number;
    amount: number;
    color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, count, amount, color }) => {
    return (
        <div className={`bg-white dark:bg-dark-card rounded-xl shadow-md p-6 border-l-4 ${color} transition-colors`}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{count}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatRupiah(amount)}
                    </p>
                </div>
                <div className="text-4xl opacity-20">
                    {title === 'Pending' && '⏳'}
                    {title === 'Completed' && '✅'}
                    {title === 'Failed' && '❌'}
                </div>
            </div>
        </div>
    );
};

export default StatsCard;