import React from 'react';
import { Settings, RefreshCw, Code, MessageCircle } from 'lucide-react';

interface WelcomeScreenProps {
    isOnLeetCode: boolean;
    hasApiKey: boolean;
    onNavigateToSettings: () => void;
    onRefresh: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    isOnLeetCode,
    hasApiKey,
    onNavigateToSettings,
    onRefresh
}) => {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Code className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    LeetMentor
                </h1>
                <p className="text-gray-600">
                    AI-powered interview practice for LeetCode problems
                </p>
            </div>

            {/* Status Cards */}
            <div className="space-y-3">
                {/* API Key Status */}
                <div className={`p-4 rounded-lg border ${hasApiKey
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                            <span className="font-medium text-gray-900">
                                OpenAI API Key
                            </span>
                        </div>
                        <span className={`text-sm ${hasApiKey ? 'text-green-700' : 'text-red-700'
                            }`}>
                            {hasApiKey ? 'Configured' : 'Required'}
                        </span>
                    </div>
                    {!hasApiKey && (
                        <p className="text-sm text-red-600 mt-2">
                            Configure your OpenAI API key to start practicing
                        </p>
                    )}
                </div>

                {/* LeetCode Detection */}
                <div className={`p-4 rounded-lg border ${isOnLeetCode
                        ? 'border-green-200 bg-green-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${isOnLeetCode ? 'bg-green-500' : 'bg-yellow-500'
                                }`} />
                            <span className="font-medium text-gray-900">
                                LeetCode Problem
                            </span>
                        </div>
                        <span className={`text-sm ${isOnLeetCode ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                            {isOnLeetCode ? 'Detected' : 'Not Found'}
                        </span>
                    </div>
                    {!isOnLeetCode && (
                        <p className="text-sm text-yellow-700 mt-2">
                            Navigate to a LeetCode problem page to start practicing
                        </p>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-blue-900 mb-1">
                            How to get started:
                        </h3>
                        <ol className="text-sm text-blue-800 space-y-1">
                            <li>1. Configure your OpenAI API key in settings</li>
                            <li>2. Navigate to any LeetCode problem page</li>
                            <li>3. Click "Start Interview Practice" to begin</li>
                            <li>4. Practice with AI voice coaching!</li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                {!hasApiKey && (
                    <button
                        onClick={onNavigateToSettings}
                        className="btn-primary w-full flex items-center justify-center space-x-2"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Configure Settings</span>
                    </button>
                )}

                <button
                    onClick={onRefresh}
                    className="btn-secondary w-full flex items-center justify-center space-x-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Status</span>
                </button>

                <button
                    onClick={onNavigateToSettings}
                    className="btn-ghost w-full flex items-center justify-center space-x-2"
                >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                </button>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
                LeetMentor v1.0.0 • Practice makes perfect
            </div>
        </div>
    );
};

export default WelcomeScreen;
