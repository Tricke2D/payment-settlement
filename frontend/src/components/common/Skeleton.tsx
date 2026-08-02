import React from 'react';

export const SkeletonCard: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
    );
};

export const SkeletonTable: React.FC = () => {
    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-md p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid grid-cols-5 gap-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const SkeletonStats: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-dark-card rounded-xl shadow-md p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
            ))}
        </div>
    );
};