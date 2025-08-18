import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-12 h-12 relative">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            </div>

            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    LeetMentor
                </h3>
                <p className="text-sm text-gray-600">
                    Initializing your AI interview coach...
                </p>
            </div>
        </div>
    );
};

export default LoadingScreen;
