import React from 'react';

const AdminSkeleton = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Skeleton */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="animate-pulse">
                            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                        </div>
                        <div className="animate-pulse">
                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search and Filter Skeleton */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 animate-pulse">
                    <div className="flex-1">
                        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                        <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                        <div className="h-10 w-20 bg-gray-200 rounded-lg"></div>
                    </div>
                    <div className="h-10 w-24 bg-gray-200 rounded-lg flex items-center justify-center">
                        <div className="h-5 w-5 bg-gray-300 rounded"></div>
                    </div>
                </div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-gray-200 rounded-lg">
                                    <div className="h-6 w-6 bg-gray-300 rounded"></div>
                                </div>
                                <div>
                                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs Skeleton */}
                <div className="bg-white rounded-xl shadow-md animate-pulse">
                    <div className="border-b border-gray-200">
                        <div className="flex space-x-8 px-6 py-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-6 bg-gray-200 rounded w-24"></div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Table Skeleton */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        {[...Array(4)].map((_, i) => (
                                            <th key={i} className="text-left py-3 px-4">
                                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...Array(5)].map((_, rowIdx) => (
                                        <tr key={rowIdx} className="border-b border-gray-100">
                                            {[...Array(4)].map((_, cellIdx) => (
                                                <td key={cellIdx} className="py-4 px-4">
                                                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSkeleton;