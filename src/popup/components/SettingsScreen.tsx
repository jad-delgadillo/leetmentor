import React, { useState } from 'react';
import { ExtensionConfig } from '../../types/api';
import { ArrowLeft, Save, Key, TestTube, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { isValidOpenAIKey } from '../../shared/utils';
import { CHATGPT_MODELS, VOICE_LANGUAGES, MODEL_PRICING_USD_PER_1K } from '../../shared/constants';

interface SettingsScreenProps {
    config: ExtensionConfig;
    onUpdateConfig: (config: Partial<ExtensionConfig>) => void;
    onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
    config,
    onUpdateConfig,
    onBack
}) => {
    const [tempConfig, setTempConfig] = useState(config);
    const [isTestingApi, setIsTestingApi] = useState(false);
    const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);

    const handleConfigChange = (key: keyof ExtensionConfig, value: any) => {
        const newConfig = { ...tempConfig, [key]: value };
        setTempConfig(newConfig);
    };

    const handleVoiceConfigChange = (key: keyof ExtensionConfig['voice'], value: any) => {
        const newVoiceConfig = { ...tempConfig.voice, [key]: value };
        handleConfigChange('voice', newVoiceConfig);
    };

    const handleSpeechConfigChange = (key: keyof ExtensionConfig['speechRecognition'], value: any) => {
        const newSpeechConfig = { ...tempConfig.speechRecognition, [key]: value };
        handleConfigChange('speechRecognition', newSpeechConfig);
    };

    const saveSettings = () => {
        onUpdateConfig(tempConfig);
        setApiTestResult(null);
    };

    const testApiKey = async () => {
        if (!tempConfig.apiKey) {
            setApiTestResult({ success: false, message: 'Please enter an API key first' });
            return;
        }

        if (!isValidOpenAIKey(tempConfig.apiKey)) {
            setApiTestResult({ success: false, message: 'Invalid API key format' });
            return;
        }

        setIsTestingApi(true);
        setApiTestResult(null);

        try {
            // Import ChatGPTService dynamically to avoid issues in popup context
            const { ChatGPTService } = await import('../../shared/chatgpt-service');
            const service = new ChatGPTService(tempConfig.apiKey, tempConfig.model);
            const isValid = await service.testConnection();

            if (isValid) {
                setApiTestResult({ success: true, message: 'API key is valid and working!' });
            } else {
                setApiTestResult({ success: false, message: 'API key test failed. Please check your key.' });
            }
        } catch (error) {
            setApiTestResult({
                success: false,
                message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setIsTestingApi(false);
        }
    };

    const isApiKeyValid = isValidOpenAIKey(tempConfig.apiKey);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <button onClick={onBack} className="btn-ghost p-2">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                    <p className="text-sm text-gray-600">Configure your interview experience</p>
                </div>
            </div>

            {/* API Key Section */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900">OpenAI API Configuration</h3>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={tempConfig.apiKey}
                                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                                placeholder="sk-..."
                                className={`input pr-20 ${!isApiKeyValid && tempConfig.apiKey ? 'input-error' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-12 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
                            >
                                {showApiKey ? 'Hide' : 'Show'}
                            </button>
                            {tempConfig.apiKey && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    {isApiKeyValid ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                        {!isApiKeyValid && tempConfig.apiKey && (
                            <p className="text-sm text-red-600 mt-1">
                                Invalid API key format. Should start with 'sk-' followed by a long string of characters.
                            </p>
                        )}
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={testApiKey}
                            disabled={!isApiKeyValid || isTestingApi}
                            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                        >
                            <TestTube className="w-4 h-4" />
                            <span>{isTestingApi ? 'Testing...' : 'Test API Key'}</span>
                        </button>

                        <button
                            onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                            className="btn-ghost flex items-center space-x-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>Get API Key</span>
                        </button>
                    </div>

                    {apiTestResult && (
                        <div className={`p-3 rounded-lg border ${apiTestResult.success
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                            }`}>
                            <div className="flex items-center space-x-2">
                                {apiTestResult.success ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <XCircle className="w-4 h-4" />
                                )}
                                <span className="text-sm">{apiTestResult.message}</span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            AI Model
                        </label>
                        <select
                            value={tempConfig.model}
                            onChange={(e) => handleConfigChange('model', e.target.value)}
                            className="input"
                        >
                            {CHATGPT_MODELS.map(model => (
                                <option key={model} value={model}>
                                    {model}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Approx. per 1k tokens — input: ${((MODEL_PRICING_USD_PER_1K as any)[tempConfig.model]?.input ?? 0).toFixed(3)} USD, output: ${((MODEL_PRICING_USD_PER_1K as any)[tempConfig.model]?.output ?? 0).toFixed(3)} USD
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Conversation Window Size (last-N turns)
                        </label>
                        <select
                            value={String(tempConfig.historyWindow ?? 8)}
                            onChange={(e) => handleConfigChange('historyWindow', parseInt(e.target.value, 10))}
                            className="input"
                        >
                            {[6,8,10,12].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Lower values reduce token usage; 8 is a good balance.</p>
                    </div>
                </div>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Voice Settings</h3>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Voice Language
                        </label>
                        <select
                            value={tempConfig.voice.language}
                            onChange={(e) => handleVoiceConfigChange('language', e.target.value)}
                            className="input"
                        >
                            {VOICE_LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Speech Rate: {tempConfig.voice.rate.toFixed(1)}x
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.1"
                            value={tempConfig.voice.rate}
                            onChange={(e) => handleVoiceConfigChange('rate', parseFloat(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pitch: {tempConfig.voice.pitch.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={tempConfig.voice.pitch}
                            onChange={(e) => handleVoiceConfigChange('pitch', parseFloat(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Volume: {Math.round(tempConfig.voice.volume * 100)}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={tempConfig.voice.volume}
                            onChange={(e) => handleVoiceConfigChange('volume', parseFloat(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Practice Areas */}
            <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Focus Areas</h3>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        'Algorithms',
                        'Data Structures',
                        'Dynamic Programming',
                        'Graph Theory',
                        'System Design',
                        'Behavioral'
                    ].map(area => {
                        const key = area.toLowerCase().replace(' ', '-');
                        const isSelected = tempConfig.practiceAreas.includes(key);

                        return (
                            <label
                                key={area}
                                className={`flex items-center space-x-2 p-2 border rounded cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        const newAreas = e.target.checked
                                            ? [...tempConfig.practiceAreas, key]
                                            : tempConfig.practiceAreas.filter(a => a !== key);
                                        handleConfigChange('practiceAreas', newAreas);
                                    }}
                                    className="rounded"
                                />
                                <span className="text-sm">{area}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-gray-200">
                <button
                    onClick={saveSettings}
                    className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                </button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 text-center">
                Your settings are stored locally and never shared with anyone.
            </div>
        </div>
    );
};

export default SettingsScreen;
