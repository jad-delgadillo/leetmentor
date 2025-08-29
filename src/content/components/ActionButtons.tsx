import React from 'react';

interface ActionButtonsProps {
    onStartInterview?: () => void;
    onSettingsClick?: () => void;
    isInterviewActive?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
    onStartInterview,
    onSettingsClick,
    isInterviewActive = false
}) => {
    return (
        <div className="p-6 flex gap-4 items-stretch">
            <button
                id="start-interview-btn"
                onClick={onStartInterview}
                disabled={!onStartInterview}
                className={`
                    group relative flex items-center gap-3 px-8 py-4 text-base font-semibold cursor-pointer 
                    transition-all duration-300 ease-out flex-1 justify-center rounded-xl overflow-hidden
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${isInterviewActive
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl hover:shadow-orange-500/25 active:scale-[0.98]'
                        : 'leetmentor-button-primary shadow-lg hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98]'
                    }
                `}
            >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Status indicator for active state */}
                {isInterviewActive && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse-slow" />
                )}

                <span className={`text-xl transition-transform duration-300 ${isInterviewActive ? 'animate-bounce-gentle' : 'group-hover:scale-110'}`}>
                    {isInterviewActive ? '🎯' : '🚀'}
                </span>

                <span className="font-semibold tracking-wide">
                    {isInterviewActive ? 'Interview In Progress' : 'Start Interview'}
                </span>

                {!isInterviewActive && (
                    <div className="ml-2 transform group-hover:translate-x-1 transition-transform duration-300">
                        →
                    </div>
                )}
            </button>

            {onSettingsClick && (
                <button
                    id="settings-btn"
                    onClick={onSettingsClick}
                    className="
                        group flex items-center justify-center p-4 flex-shrink-0 rounded-xl
                        bg-white/10 backdrop-blur-sm border border-white/20 text-gray-700
                        hover:bg-white/20 hover:border-white/30 hover:scale-105
                        active:scale-95 transition-all duration-200
                    "
                    title="Settings"
                >
                    <span className="text-xl group-hover:rotate-45 transition-transform duration-300">⚙️</span>
                </button>
            )}
        </div>
    );
};

export default ActionButtons;
