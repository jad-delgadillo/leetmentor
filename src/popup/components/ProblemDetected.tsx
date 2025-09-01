import React from 'react';
import { LeetCodeProblem } from '../../types/leetcode';
import { Play, Settings, ExternalLink, Clock, Tag, Lightbulb } from 'lucide-react';
import { getDifficultyColor } from '../../shared/utils';

interface ProblemDetectedProps {
    problem: LeetCodeProblem;
    onStartInterview: () => void;
    onSettings: () => void;
}

const ProblemDetected: React.FC<ProblemDetectedProps> = ({
    problem,
    onStartInterview,
    onSettings
}) => {
    const difficultyClass = getDifficultyColor(problem.difficulty);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-1">
                    Problem Detected!
                </h1>
                <p className="text-sm text-gray-600">
                    Ready to start your AI interview practice
                </p>
            </div>

            {/* Problem Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h2 className="font-semibold text-gray-900 leading-tight mb-2">
                            {problem.title}
                        </h2>
                        <div className="flex items-center space-x-3">
                            <span className={`badge ${difficultyClass}`}>
                                {problem.difficulty}
                            </span>
                            {problem.id && (
                                <span className="text-xs text-gray-500">
                                    Problem #{problem.id}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => window.open(problem.url, '_blank')}
                        className="btn-ghost p-2"
                        aria-label="Open problem in new tab"
                        title="Open problem in new tab"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>

                {/* Problem Description Preview */}
                {problem.description && (
                    <div className="border-t border-gray-100 pt-3">
                        <p className="text-sm text-gray-700 line-clamp-3">
                            {problem.description.slice(0, 150)}
                            {problem.description.length > 150 && '...'}
                        </p>
                    </div>
                )}

                {/* Topic Tags */}
                {problem.topicTags && problem.topicTags.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <Tag className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Topics:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {problem.topicTags.slice(0, 3).map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                    {tag}
                                </span>
                            ))}
                            {problem.topicTags.length > 3 && (
                                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                                    +{problem.topicTags.length - 3} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Interview Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                            What to expect:
                        </h3>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li>• AI interviewer will guide you through the problem</li>
                            <li>• Voice conversation with real-time feedback</li>
                            <li>• Practice explaining your approach</li>
                            <li>• Get detailed performance feedback</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                <button
                    onClick={onStartInterview}
                    className="btn-primary w-full flex items-center justify-center space-x-2 text-base py-3"
                >
                    <Play className="w-5 h-5" />
                    <span>Start Interview Practice</span>
                </button>

                <button
                    onClick={onSettings}
                    className="btn-secondary w-full flex items-center justify-center space-x-2"
                >
                    <Settings className="w-4 h-4" />
                    <span>Interview Settings</span>
                </button>
            </div>

            {/* Quick Tips */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm">
                    <span className="inline-flex items-center gap-1 font-medium text-yellow-800">
                        <Lightbulb className="w-4 h-4" /> Pro tip:
                    </span>
                    <span className="text-yellow-700 ml-1">
                        Enable voice features for the most realistic interview experience!
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProblemDetected;
