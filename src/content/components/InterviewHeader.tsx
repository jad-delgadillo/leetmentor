import React from 'react';
import { Settings } from 'lucide-react';

interface InterviewHeaderProps {
    title?: string;
    subtitle?: string;
    status?: 'ready' | 'active' | 'paused' | 'error';
    onSettingsClick?: () => void;
    usage?: { totalTokens: number; costUsd: number; model?: string };
}

const InterviewHeader: React.FC<InterviewHeaderProps> = ({
    title = "Leet Mentor",
    subtitle = "AI Interview Assistant",
    status = 'ready',
    onSettingsClick,
    usage
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ready': return 'status-indicator-ready';
            case 'active': return 'status-indicator-active';
            case 'paused': return 'status-indicator-paused';
            case 'error': return 'status-indicator-error';
            default: return 'status-indicator-ready';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'ready': return 'READY';
            case 'active': return 'ACTIVE';
            case 'paused': return 'PAUSED';
            case 'error': return 'ERROR';
            default: return 'READY';
        }
    };

    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
                        <span className="text-base font-semibold text-gray-700">LM</span>
                    </div>
                    <div className="leading-tight">
                        <div className="text-2xl font-semibold text-gray-900">
                            {title}
                        </div>
                        <div className="text-sm text-gray-500">
                            {subtitle}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200">
                        <div className={`status-indicator ${getStatusColor(status)}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                            {getStatusText(status)}
                        </span>
                    </div>

                    {usage && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-gray-700" title={usage.model ? `Model: ${usage.model}` : undefined}>
                            <span className="text-xs font-medium">Cost:</span>
                            <span className="text-sm font-semibold">${usage.costUsd.toFixed(2)}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs">Tokens: {usage.totalTokens}</span>
                        </div>
                    )}

                    {onSettingsClick && (
                        <button
                            onClick={onSettingsClick}
                            className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white"
                            aria-label="Open settings"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5 text-gray-700" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterviewHeader;
