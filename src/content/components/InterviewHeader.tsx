import React from 'react';

interface InterviewHeaderProps {
    title?: string;
    subtitle?: string;
    status?: 'ready' | 'active' | 'paused' | 'error';
    onSettingsClick?: () => void;
}

const InterviewHeader: React.FC<InterviewHeaderProps> = ({
    title = "Leet Mentor",
    subtitle = "AI Interview Assistant",
    status = 'ready',
    onSettingsClick
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
        <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border-b border-white/10 p-6 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500 to-blue-500 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
            </div>

            <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 animate-fade-in-scale">
                        <span className="text-xl">🎯</span>
                    </div>
                    <div className="leading-tight">
                        <div className="text-2xl font-bold text-gray-800 tracking-tight">
                            {title}
                        </div>
                        <div className="text-sm font-medium text-gray-600 uppercase tracking-wider">
                            {subtitle}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                        <div className={`status-indicator ${getStatusColor(status)}`}></div>
                        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            {getStatusText(status)}
                        </span>
                    </div>

                    {onSettingsClick && (
                        <button
                            onClick={onSettingsClick}
                            className="
                                group p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl
                                hover:bg-white/20 hover:border-white/30 hover:scale-105
                                active:scale-95 transition-all duration-200
                            "
                            title="Settings"
                        >
                            <span className="text-lg group-hover:rotate-45 transition-transform duration-300">⚙️</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterviewHeader;
