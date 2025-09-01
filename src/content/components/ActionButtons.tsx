import React from 'react';
import { Rocket, Target, Settings } from 'lucide-react';

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
        <div className="px-6 py-4 flex gap-4 items-stretch">
            <button
                id="start-interview-btn"
                onClick={onStartInterview}
                disabled={!onStartInterview}
                className={`
                    inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-md flex-1
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white
                    disabled:opacity-50 disabled:pointer-events-none
                    ${isInterviewActive
                        ? 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500'
                        : 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500'
                    }
                `}
            >
                <span className="mr-2 text-lg">
                    {isInterviewActive ? (
                        <Target className="w-5 h-5" />
                    ) : (
                        <Rocket className="w-5 h-5" />
                    )}
                </span>

                <span className="tracking-wide">
                    {isInterviewActive ? 'Interview In Progress' : 'Start Interview'}
                </span>
            </button>

            {onSettingsClick && (
                <button
                    id="settings-btn"
                    onClick={onSettingsClick}
                    className="inline-flex items-center justify-center p-3 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white"
                    aria-label="Open settings"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default ActionButtons;
