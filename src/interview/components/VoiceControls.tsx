import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Code, Gauge, Zap } from 'lucide-react';

interface VoiceControlsProps {
    isListening: boolean;
    isSpeaking: boolean;
    isEnabled: boolean;
    onStartListening: () => void;
    onStopListening: () => void;
    onStopSpeaking: () => void;
    onOpenCodeEditor?: () => void;
    onSpeechRateChange?: (rate: number) => void;
    currentSpeechRate?: number;
    useRealtimeAPI?: boolean;
    onToggleRealtimeAPI?: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
    isListening,
    isSpeaking,
    isEnabled,
    onStartListening,
    onStopListening,
    onStopSpeaking,
    onOpenCodeEditor,
    onSpeechRateChange,
    currentSpeechRate = 1.0,
    useRealtimeAPI = false,
    onToggleRealtimeAPI
}) => {
    // Add keyboard shortcut for push-to-talk (spacebar)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && isEnabled && !isSpeaking && !isListening && e.target === document.body) {
                e.preventDefault();
                onStartListening();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && isEnabled && isListening) {
                e.preventDefault();
                onStopListening();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [isEnabled, isListening, isSpeaking, onStartListening, onStopListening]);

    return (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
                {/* Voice Status */}
                <div className="flex items-center space-x-3">
                    {/* Listening Status */}
                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                            }`} />
                        <span className="text-xs font-medium text-gray-700">
                            {isListening ? 'Listening' : 'Voice Ready'}
                        </span>
                    </div>

                    {/* Speaking Status */}
                    {isSpeaking && (
                        <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                                <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0ms' }} />
                                <div className="w-1 h-6 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '150ms' }} />
                                <div className="w-1 h-8 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                                <div className="w-1 h-6 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '450ms' }} />
                                <div className="w-1 h-4 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '600ms' }} />
                            </div>
                            <span className="text-xs font-medium text-blue-700">
                                AI Speaking...
                            </span>
                        </div>
                    )}
                </div>

                {/* Voice Controls */}
                <div className="flex items-center space-x-2">
                    {/* Microphone Control */}
                    {isEnabled && (
                        <button
                            onClick={isListening ? onStopListening : onStartListening}
                            disabled={isSpeaking}
                            className={`btn p-3 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 ${isListening
                                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-300'
                                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-110'
                                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                            title={isListening ? 'Stop listening (or release Space)' : 'Start voice input (or hold Space)'}
                        >
                            {isListening ? (
                                <MicOff className="w-5 h-5" />
                            ) : (
                                <Mic className="w-5 h-5" />
                            )}
                        </button>
                    )}

                    {/* Stop Speaking Control */}
                    {isSpeaking && (
                        <button
                            onClick={onStopSpeaking}
                            className="btn-secondary p-2"
                            title="Stop AI speaking"
                        >
                            <VolumeX className="w-4 h-4" />
                        </button>
                    )}

                    {/* Code Editor Button */}
                    {onOpenCodeEditor && (
                        <button
                            onClick={onOpenCodeEditor}
                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-md transition-colors shadow-sm"
                            title="Open code editor"
                        >
                            <Code className="w-4 h-4" />
                        </button>
                    )}

                    {/* Speech Rate Control - Only for traditional voice */}
                    {onSpeechRateChange && !useRealtimeAPI && (
                        <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
                            <Gauge className="w-3 h-3 text-gray-600" />
                            {[1.0, 1.25, 1.5, 2.0].map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => onSpeechRateChange(rate)}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${Math.abs(currentSpeechRate - rate) < 0.01
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-transparent text-gray-600 hover:bg-gray-200'
                                        }`}
                                    title={`Speech speed ${rate}x`}
                                >
                                    {rate}x
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Realtime API Toggle */}
                    {onToggleRealtimeAPI && (
                        <button
                            onClick={onToggleRealtimeAPI}
                            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${useRealtimeAPI
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            title={useRealtimeAPI ? 'Switch to Traditional Voice' : 'Switch to Realtime API (ChatGPT-level)'}
                        >
                            <Zap className="w-3 h-3" />
                            <span>{useRealtimeAPI ? 'Realtime' : 'Traditional'}</span>
                        </button>
                    )}

                    {/* Voice Status Indicator */}
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded ${useRealtimeAPI
                        ? 'bg-purple-100'
                        : 'bg-blue-100'
                        }`}>
                        <Volume2 className={`w-3 h-3 ${useRealtimeAPI
                            ? 'text-purple-600'
                            : 'text-blue-600'
                            }`} />
                        <span className={`text-xs font-medium ${useRealtimeAPI
                            ? 'text-purple-700'
                            : 'text-blue-700'
                            }`}>
                            {isEnabled
                                ? (useRealtimeAPI ? 'ChatGPT Realtime' : 'OpenAI Voice + Whisper')
                                : 'Voice Disabled'
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Voice Tips */}
            {isEnabled && !isListening && !isSpeaking && (
                <div className="mt-2 text-xs text-center">
                    {useRealtimeAPI ? (
                        <span className="text-purple-600">
                            ⚡ Realtime mode • Hold <kbd className="bg-purple-100 px-1 rounded text-purple-700">Space</kbd> or click mic for instant response
                        </span>
                    ) : (
                        <span className="text-blue-600">
                            🎤 Enhanced accent recognition • Hold <kbd className="bg-blue-100 px-1 rounded text-blue-700">Space</kbd> or click mic to talk
                        </span>
                    )}
                </div>
            )}

            {/* Realtime API Status */}
            {useRealtimeAPI && !isListening && !isSpeaking && (
                <div className="mt-1 text-xs text-center text-gray-500">
                    Note: Realtime API requires server setup - currently using enhanced traditional voice
                </div>
            )}

            {/* Listening Tip */}
            {isListening && (
                <div className="mt-2 text-xs text-center">
                    <span className="text-red-600 font-medium">● Recording</span>
                    <span className="text-gray-500 ml-2">Speak your response clearly</span>
                </div>
            )}

            {/* Speaking Tip */}
            {isSpeaking && (
                <div className="mt-2 text-xs text-blue-600 text-center font-medium">
                    🎵 AI is speaking... Click stop button to interrupt
                </div>
            )}
        </div>
    );
};

export default VoiceControls;
