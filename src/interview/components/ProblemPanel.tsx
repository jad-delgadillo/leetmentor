import React, { useState } from 'react';
import { LeetCodeProblem } from '../../types/leetcode';
import { ExternalLink, ChevronDown, ChevronUp, Tag, FileText, TestTube } from 'lucide-react';
import { getDifficultyColor } from '../../shared/utils';

interface ProblemPanelProps {
    problem: LeetCodeProblem | null;
}

const ProblemPanel: React.FC<ProblemPanelProps> = ({ problem }) => {
    const [expandedSections, setExpandedSections] = useState({
        description: true,
        examples: true,
        constraints: false,
        hints: false
    });

    if (!problem) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No problem loaded</p>
                </div>
            </div>
        );
    }

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const difficultyClass = getDifficultyColor(problem.difficulty);

    return (
        <div className="h-full flex flex-col">
            {/* Problem Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                        {problem.title}
                    </h2>
                    <button
                        onClick={() => window.open(problem.url, '_blank')}
                        className="btn-ghost p-2 ml-2"
                        title="Open in LeetCode"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className={`badge ${difficultyClass}`}>
                            {problem.difficulty}
                        </span>
                        {problem.id && (
                            <span className="text-sm text-gray-500">
                                #{problem.id}
                            </span>
                        )}
                    </div>

                    {/* Topic Tags */}
                    {problem.topicTags && problem.topicTags.length > 0 && (
                        <div className="flex items-center space-x-1">
                            <Tag className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                                {problem.topicTags.slice(0, 2).join(', ')}
                                {problem.topicTags.length > 2 && ` +${problem.topicTags.length - 2}`}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Problem Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Description */}
                <div className="border-b border-gray-200">
                    <button
                        onClick={() => toggleSection('description')}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <h3 className="font-semibold text-gray-900">Description</h3>
                        {expandedSections.description ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                    </button>

                    {expandedSections.description && (
                        <div className="px-6 pb-4">
                            <div className="prose prose-sm max-w-none text-gray-700">
                                {problem.description && problem.description.length > 10 ? (
                                    <div className="whitespace-pre-wrap">
                                        {problem.description}
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <p className="text-yellow-800 font-medium mb-2">
                                            ⚠️ Problem description not available
                                        </p>
                                        <p className="text-yellow-700 text-sm">
                                            The extension couldn't extract the problem description from the current page.
                                            This might happen if:
                                        </p>
                                        <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
                                            <li>The page is still loading</li>
                                            <li>LeetCode changed their layout</li>
                                            <li>You're on a premium problem page</li>
                                        </ul>
                                        <p className="text-yellow-700 text-sm mt-2">
                                            <strong>Tip:</strong> Try refreshing the LeetCode page and starting the interview again.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Examples */}
                {problem.exampleTestCases && problem.exampleTestCases.length > 0 && (
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => toggleSection('examples')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900">Examples</h3>
                                <span className="badge badge-info text-xs">
                                    {problem.exampleTestCases.length}
                                </span>
                            </div>
                            {expandedSections.examples ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                        </button>

                        {expandedSections.examples && (
                            <div className="px-6 pb-4 space-y-4">
                                {problem.exampleTestCases.map((example, index) => (
                                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 mb-2">
                                            Example {index + 1}:
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <span className="font-medium text-gray-700">Input:</span>
                                                <code className="ml-2 bg-gray-200 px-2 py-1 rounded font-mono">
                                                    {example.input}
                                                </code>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Output:</span>
                                                <code className="ml-2 bg-gray-200 px-2 py-1 rounded font-mono">
                                                    {example.output}
                                                </code>
                                            </div>
                                            {example.explanation && (
                                                <div>
                                                    <span className="font-medium text-gray-700">Explanation:</span>
                                                    <p className="ml-2 text-gray-600">{example.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Constraints */}
                {problem.constraints && problem.constraints.length > 0 && (
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => toggleSection('constraints')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <h3 className="font-semibold text-gray-900">Constraints</h3>
                            {expandedSections.constraints ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                        </button>

                        {expandedSections.constraints && (
                            <div className="px-6 pb-4">
                                <ul className="space-y-1 text-sm text-gray-700">
                                    {problem.constraints.map((constraint, index) => (
                                        <li key={index} className="flex items-start">
                                            <span className="text-gray-400 mr-2">•</span>
                                            <code className="bg-gray-100 px-1 rounded text-xs">
                                                {constraint}
                                            </code>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Hints */}
                {problem.hints && problem.hints.length > 0 && (
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => toggleSection('hints')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center space-x-2">
                                <h3 className="font-semibold text-gray-900">Hints</h3>
                                <span className="badge badge-warning text-xs">
                                    {problem.hints.length}
                                </span>
                            </div>
                            {expandedSections.hints ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                        </button>

                        {expandedSections.hints && (
                            <div className="px-6 pb-4 space-y-2">
                                {problem.hints.map((hint, index) => (
                                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <div className="flex items-start space-x-2">
                                            <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                                                Hint {index + 1}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-2">{hint}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Topic Tags (expanded) */}
                {problem.topicTags && problem.topicTags.length > 0 && (
                    <div className="p-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Related Topics</h3>
                        <div className="flex flex-wrap gap-2">
                            {problem.topicTags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProblemPanel;
