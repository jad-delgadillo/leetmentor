import React, { useState } from 'react';
import { LeetCodeProblem } from '../../types/leetcode';
import { ExtensionConfig } from '../../types/api';
import { ArrowLeft, Play, Mic, Volume2, Settings as SettingsIcon } from 'lucide-react';
import { useEffect } from 'react';
import { INTERVIEW_DIFFICULTY_LEVELS } from '../../shared/constants';

interface InterviewSettingsProps {
    problem: LeetCodeProblem;
    config: ExtensionConfig;
    onUpdateConfig: (config: Partial<ExtensionConfig>) => void;
    onStartInterview: () => void;
    onBack: () => void;
}

const InterviewSettings: React.FC<InterviewSettingsProps> = ({
    problem,
    config,
    onUpdateConfig,
    onStartInterview,
    onBack
}) => {
    const [tempConfig, setTempConfig] = useState(config);
    const [usageTotals, setUsageTotals] = useState<{ prompt: number; completion: number; total: number; costUsd: number; model?: string; ts?: number } | null>(null);

    const handleConfigChange = (key: keyof ExtensionConfig, value: any) => {
        const newConfig = { ...tempConfig, [key]: value };
        setTempConfig(newConfig);
        onUpdateConfig({ [key]: value });
    };

    const handleVoiceConfigChange = (key: keyof ExtensionConfig['voice'], value: any) => {
        const newVoiceConfig = { ...tempConfig.voice, [key]: value };
        const newConfig = { ...tempConfig, voice: newVoiceConfig };
        setTempConfig(newConfig);
        onUpdateConfig({ voice: newVoiceConfig });
    };

    useEffect(() => {
        (async () => {
            try {
                const data = await chrome.storage.sync.get(['leetmentor_usage_totals']);
                if (data.leetmentor_usage_totals) setUsageTotals(data.leetmentor_usage_totals);
            } catch {}
        })();
    }, []);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <button onClick={onBack} className="btn-ghost p-2">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Interview Settings
                    </h1>
                    <p className="text-sm text-gray-600">
                        {problem.title}
                    </p>
                </div>
            </div>

            {/* Interview Difficulty */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                    Interview Difficulty
                </label>
                <div className="space-y-2">
                    {Object.entries(INTERVIEW_DIFFICULTY_LEVELS).map(([key, level]) => (
                        <label
                            key={key}
                            className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                            <input
                                type="radio"
                                name="difficulty"
                                value={key}
                                checked={tempConfig.interviewMode === key}
                                onChange={(e) => handleConfigChange('interviewMode', e.target.value)}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{level.name}</div>
                                <div className="text-sm text-gray-600">{level.description}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Time limit: {level.timeLimit} minutes
                                    {level.hints && ' • Hints available'}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900">Voice Features</h3>
                </div>

                {/* Enable Voice */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-gray-700">
                            Enable Voice Conversation
                        </div>
                        <div className="text-xs text-gray-500">
                            Talk with AI interviewer using voice
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={tempConfig.voice.enabled}
                            onChange={(e) => handleVoiceConfigChange('enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Speech Recognition */}
                {tempConfig.voice.enabled && (
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                                <Mic className="w-3 h-3" />
                                <span>Speech Recognition</span>
                            </div>
                            <div className="text-xs text-gray-500">
                                Speak your answers instead of typing
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={tempConfig.speechRecognition.enabled}
                                onChange={(e) => {
                                    const newSpeechConfig = {
                                        ...tempConfig.speechRecognition,
                                        enabled: e.target.checked
                                    };
                                    const newConfig = { ...tempConfig, speechRecognition: newSpeechConfig };
                                    setTempConfig(newConfig);
                                    onUpdateConfig({ speechRecognition: newSpeechConfig });
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                )}

                {/* Voice Speed */}
                {tempConfig.voice.enabled && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                                Speech Speed
                            </label>
                            <span className="text-sm text-gray-500">
                                {tempConfig.voice.rate.toFixed(1)}x
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={tempConfig.voice.rate}
                            onChange={(e) => handleVoiceConfigChange('rate', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                    </div>
                )}
            </div>

            {/* AI Model */}
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                    AI Model
                </label>
                <select
                    value={tempConfig.model}
                    onChange={(e) => handleConfigChange('model', e.target.value)}
                    className="input"
                >
                    <option value="gpt-4">GPT-4 (Recommended)</option>
                    <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
                <p className="text-xs text-gray-500">
                    GPT-4 provides better interview quality but costs more
                </p>
            </div>

            {/* Warning if no API key */}
            {!config.apiKey && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                        <SettingsIcon className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-800">
                            API Key Required
                        </span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                        Configure your OpenAI API key in settings before starting the interview.
                    </p>
                </div>
            )}

            {/* Start Button */}
            <button
                onClick={onStartInterview}
                disabled={!config.apiKey}
                className="btn-primary w-full flex items-center justify-center space-x-2 text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Play className="w-5 h-5" />
                <span>Start Interview</span>
            </button>

            {/* Recent Usage Totals */}
            {usageTotals && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-700 font-medium">Recent Usage</div>
                    <div className="text-xs text-gray-600 mt-1">
                        Tokens: {usageTotals.total} (prompt {usageTotals.prompt} / completion {usageTotals.completion}) · Cost: ${usageTotals.costUsd.toFixed(2)}{usageTotals.model ? ` · Model: ${usageTotals.model}` : ''}
                    </div>
                    {usageTotals.ts && (
                        <div className="text-xs text-gray-400 mt-1">Updated {new Date(usageTotals.ts).toLocaleString()}</div>
                    )}
                </div>
            )}

            {/* Quick Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm">
                    <span className="font-medium text-blue-800">Preview:</span>
                    <span className="text-blue-700 ml-1">
                        {INTERVIEW_DIFFICULTY_LEVELS[tempConfig.interviewMode as keyof typeof INTERVIEW_DIFFICULTY_LEVELS].name} interview
                        {tempConfig.voice.enabled ? ' with voice conversation' : ' with text chat'}
                        using {tempConfig.model}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default InterviewSettings;
