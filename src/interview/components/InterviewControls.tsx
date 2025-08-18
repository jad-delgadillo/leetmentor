import React from 'react';
import { Play, Pause, Square, RotateCcw, MessageSquare } from 'lucide-react';

interface InterviewControlsProps {
    status: string;
    onPause: () => void;
    onResume: () => void;
    onEnd: () => void;
}

const InterviewControls: React.FC<InterviewControlsProps> = ({
    status,
    onPause,
    onResume,
    onEnd
}) => {
    return (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
                {/* Status Info */}
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">
                            Interview Session
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' :
                                status === 'paused' ? 'bg-yellow-500' :
                                    status === 'completed' ? 'bg-blue-500' :
                                        'bg-gray-400'
                            }`} />
                        <span className="text-sm font-medium text-gray-600 capitalize">
                            {status}
                        </span>
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center space-x-2">
                    {status === 'active' && (
                        <>
                            <button
                                onClick={onPause}
                                className="btn-secondary flex items-center space-x-2"
                                title="Pause the interview"
                            >
                                <Pause className="w-4 h-4" />
                                <span>Pause</span>
                            </button>
                        </>
                    )}

                    {status === 'paused' && (
                        <>
                            <button
                                onClick={onResume}
                                className="btn-primary flex items-center space-x-2"
                                title="Resume the interview"
                            >
                                <Play className="w-4 h-4" />
                                <span>Resume</span>
                            </button>
                        </>
                    )}

                    {(status === 'active' || status === 'paused') && (
                        <>
                            <button
                                onClick={onEnd}
                                className="btn-danger flex items-center space-x-2"
                                title="End the interview and get feedback"
                            >
                                <Square className="w-4 h-4" />
                                <span>End Interview</span>
                            </button>
                        </>
                    )}

                    {status === 'completed' && (
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => window.close()}
                                className="btn-secondary"
                                title="Close interview window"
                            >
                                Close
                            </button>

                            <button
                                onClick={() => window.location.reload()}
                                className="btn-primary flex items-center space-x-2"
                                title="Start a new interview"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span>New Interview</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Messages */}
            {status === 'paused' && (
                <div className="mt-2 text-center">
                    <div className="inline-flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span className="text-sm text-yellow-800">
                            Interview paused - Resume when ready
                        </span>
                    </div>
                </div>
            )}

            {status === 'completed' && (
                <div className="mt-2 text-center">
                    <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-sm text-blue-800">
                            Interview completed - Check your feedback above
                        </span>
                    </div>
                </div>
            )}

            {/* Help Text */}
            {status === 'active' && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                    Take your time to think through the problem. The AI interviewer is here to help guide you.
                </div>
            )}
        </div>
    );
};

export default InterviewControls;
