import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
    isListening: boolean;
    isSpeaking: boolean;
    isEnabled: boolean;
    onStartListening: () => void;
    onStopListening: () => void;
    onStopSpeaking: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
    isListening,
    isSpeaking,
    isEnabled,
    onStartListening,
    onStopListening,
    onStopSpeaking
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

                    {/* Voice Status Indicator */}
                    <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded">
                        <Volume2 className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-600">
                            {isEnabled ? 'AI Voice Active' : 'Voice Disabled'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Voice Tips */}
            {isEnabled && !isListening && !isSpeaking && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                    💡 Click the microphone or hold <kbd className="bg-gray-100 px-1 rounded text-gray-700">Space</kbd> to talk
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
