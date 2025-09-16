import React from 'react';
import { LeetCodeProblem, InterviewSession } from '../../types/leetcode';
import { Clock, Play, Pause, Square, Settings } from 'lucide-react';
import { formatDuration, getDifficultyColor } from '../../shared/utils';

interface InterviewHeaderProps {
    problem: LeetCodeProblem | null;
    session: InterviewSession | null;
    status: string;
    onPause: () => void;
    onResume: () => void;
    onEnd: () => void;
    usage?: { totalTokens: number; costUsd: number; model?: string };
}

const InterviewHeader: React.FC<InterviewHeaderProps> = ({
    problem,
    session,
    status,
    onPause,
    onResume,
    onEnd,
    usage
}) => {
    const [elapsedTime, setElapsedTime] = React.useState(0);

    React.useEffect(() => {
        if (!session || status !== 'active') return;

        const interval = setInterval(() => {
            // Ensure startTime is a Date object
            const startTime = session.startTime instanceof Date
                ? session.startTime
                : new Date(session.startTime);
            const elapsed = Date.now() - startTime.getTime();
            setElapsedTime(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [session, status]);

    if (!problem || !session) return null;

    const difficultyClass = getDifficultyColor(problem.difficulty);

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            {/* Left Section - Problem Info */}
            <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">LM</span>
                </div>

                <div>
                    <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                        {problem.title}
                    </h1>
                    <div className="flex items-center space-x-3">
                        <span className={`badge text-xs ${difficultyClass}`}>
                            {problem.difficulty}
                        </span>
                        <span className="text-sm text-gray-500">
                            Interview Practice
                        </span>
                    </div>
                </div>
            </div>

            {/* Center Section - Timer */}
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-sm text-gray-700">
                        {formatDuration(elapsedTime)}
                    </span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500 animate-pulse' :
                        status === 'paused' ? 'bg-yellow-500' :
                            status === 'completed' ? 'bg-blue-500' :
                                'bg-gray-400'
                        }`} />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                        {status}
                    </span>
                </div>
            </div>

            {/* Right Section - Controls + Usage */}
            <div className="flex items-center space-x-2">
                {usage && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 text-gray-700 mr-2" title={usage.model ? `Model: ${usage.model}` : undefined}>
                        <span className="text-xs font-medium">Cost:</span>
                        <span className="text-sm font-semibold">${usage.costUsd.toFixed(2)}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs">Tokens: {usage.totalTokens}</span>
                    </div>
                )}
                {status === 'active' && (
                    <button
                        onClick={onPause}
                        className="btn-secondary flex items-center space-x-2"
                        title="Pause interview"
                    >
                        <Pause className="w-4 h-4" />
                        <span>Pause</span>
                    </button>
                )}

                {status === 'paused' && (
                    <button
                        onClick={onResume}
                        className="btn-primary flex items-center space-x-2"
                        title="Resume interview"
                    >
                        <Play className="w-4 h-4" />
                        <span>Resume</span>
                    </button>
                )}

                <button
                    onClick={onEnd}
                    className="btn-danger flex items-center space-x-2"
                    title="End interview"
                >
                    <Square className="w-4 h-4" />
                    <span>End</span>
                </button>

                <button
                    className="btn-ghost p-2"
                    title="Settings"
                    onClick={() => {
                        // Could open settings modal
                    }}
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
};

export default InterviewHeader;
