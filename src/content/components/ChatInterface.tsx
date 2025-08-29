import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    messages: ChatMessage[];
    onSendMessage?: (message: string) => void;
    onClearChat?: () => void;
    onExportChat?: () => void;
    onStartVoiceInput?: () => void;
    onStopVoiceInput?: () => void;
    onSkipVoice?: () => void;
    onSpeedChange?: (speed: number) => void;
    currentSpeed?: number;
    isVisible?: boolean;
    isTyping?: boolean;
    isListening?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    onSendMessage,
    onClearChat,
    onExportChat,
    onStartVoiceInput,
    onStopVoiceInput,
    onSkipVoice,
    onSpeedChange,
    currentSpeed = 1.0,
    isVisible = false,
    isTyping = false,
    isListening = false
}) => {
    console.log('🔧 ChatInterface props:', {
        messagesCount: messages.length,
        isVisible,
        isTyping,
        isListening,
        hasSkipVoice: !!onSkipVoice,
        onSkipVoice
    });
    const [inputValue, setInputValue] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [selectedSpeed, setSelectedSpeed] = useState(currentSpeed);
    const rafIdRef = useRef<number | null>(null);

    // Smoothly scroll only the chat container to bottom
    const smoothScrollToBottom = (duration = 250) => {
        const el = chatContainerRef.current;
        if (!el) return;

        const start = el.scrollTop;
        const end = el.scrollHeight - el.clientHeight;
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        const startTime = performance.now();

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const step = (now: number) => {
            const t = Math.min(1, (now - startTime) / duration);
            el.scrollTop = start + (end - start) * easeOutCubic(t);
            if (t < 1) {
                rafIdRef.current = requestAnimationFrame(step);
            }
        };
        rafIdRef.current = requestAnimationFrame(step);
    };

    useEffect(() => {
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        };
    }, []);

    useEffect(() => {
        setSelectedSpeed(currentSpeed);
    }, [currentSpeed]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
        }
    }, [inputValue]);

    // Smart auto-scroll - only if user hasn't scrolled up
    useEffect(() => {
        if (autoScroll && chatContainerRef.current) {
            smoothScrollToBottom(250);
        }
    }, [messages, isTyping, autoScroll]);

    // Detect if user has scrolled up in the chat
    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
            setAutoScroll(isNearBottom);
        }
    };

    // Manual scroll to bottom function
    const scrollToBottom = () => {
        smoothScrollToBottom(250);
        setAutoScroll(true);
    };

    const handleSendMessage = () => {
        const message = inputValue.trim();
        if (message && onSendMessage) {
            onSendMessage(message);
            setInputValue('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Add spacebar voice functionality
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Always prevent spacebar scrolling when chat is visible
            if (e.code === 'Space' && isVisible) {
                e.preventDefault();
                e.stopPropagation();

                // Only start voice input if conditions are met
                if ((e.target === document.body || e.target === document.documentElement) &&
                    !e.repeat &&
                    !isListening) {
                    console.log('🎤 Spacebar pressed - Starting voice input');
                    onStartVoiceInput?.();
                }
            }
        };

        const handleGlobalKeyUp = (e: KeyboardEvent) => {
            // Space bar release to stop voice input - should work regardless of target when listening
            if (e.code === 'Space' &&
                isVisible &&
                isListening) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎤 Spacebar released - Stopping voice input');
                onStopVoiceInput?.();
            }
            // Escape key as fallback to stop voice input
            if (e.code === 'Escape' &&
                isVisible &&
                isListening) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎤 Escape pressed - Force stopping voice input');
                onStopVoiceInput?.();
            }
        };

        if (isVisible) {
            document.addEventListener('keydown', handleGlobalKeyDown, true);
            document.addEventListener('keyup', handleGlobalKeyUp, true);
            // Also add to window for extra safety
            window.addEventListener('keyup', handleGlobalKeyUp, true);
        }

        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown, true);
            document.removeEventListener('keyup', handleGlobalKeyUp, true);
            window.removeEventListener('keyup', handleGlobalKeyUp, true);
        };
    }, [isVisible, isListening, onStartVoiceInput, onStopVoiceInput]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isVisible) return null;

    return (
        <div className="bg-white/5 border-t border-white/10 backdrop-blur-xl flex flex-col overflow-hidden relative">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="flex items-center gap-3">
                    <div className="status-indicator status-indicator-ready"></div>
                    <div className="text-base font-bold text-gray-800 tracking-wide">
                        Interview Session
                    </div>
                    <div className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full">
                        {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onClearChat}
                        disabled={messages.length === 0}
                        className="
                            group px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 tracking-wide
                            bg-gray-100 text-gray-700 border border-gray-200
                            hover:bg-gray-200 hover:border-gray-300 hover:scale-105
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            active:scale-95
                        "
                        title="Clear chat history"
                    >
                        <span className="group-hover:mr-1 transition-all duration-200">🗑️</span>
                        Clear
                    </button>
                    <button
                        onClick={onExportChat}
                        disabled={messages.length === 0}
                        className="
                            group px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 tracking-wide
                            bg-blue-500 text-white border border-blue-600
                            hover:bg-blue-600 hover:border-blue-700 hover:scale-105
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                            active:scale-95
                        "
                        title="Export chat transcript"
                    >
                        <span className="group-hover:mr-1 transition-all duration-200">📁</span>
                        Export
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div
                ref={chatContainerRef}
                className="chat-messages"
                onScroll={handleScroll}
            >
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="text-4xl mb-3">💬</div>
                        <div className="text-gray-600 font-medium">No messages yet</div>
                        <div className="text-sm text-gray-500 mt-1">Start the interview to begin your conversation</div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div key={message.id} className="flex gap-4">
                            <div className={`message-avatar ${message.role === 'user' ? 'message-avatar-user' : 'message-avatar-assistant'}`}>
                                {message.role === 'user' ? '👤' : '🤖'}
                            </div>
                            <div className={`flex-1 p-4 rounded-2xl font-medium backdrop-blur-lg ${message.role === 'user' ? 'message-user' : 'message-assistant'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                                        {message.role === 'user' ? 'You' : 'AI Interviewer'}
                                    </div>
                                    <div className="text-xs opacity-60 font-medium">
                                        {formatTime(message.timestamp)}
                                    </div>
                                </div>
                                <div className="whitespace-pre-wrap break-words leading-relaxed">
                                    {message.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Enhanced Typing Indicator */}
                {isTyping && (
                    <div className="flex gap-4">
                        <div className="message-avatar message-avatar-assistant">🤖</div>
                        <div className="flex-1 message-assistant p-4 rounded-2xl backdrop-blur-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                                        AI Interviewer
                                    </div>
                                    <div className="text-xs opacity-60">
                                        speaking...
                                    </div>
                                </div>
                                {onSkipVoice ? (
                                    <button
                                        onClick={onSkipVoice}
                                        className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors flex items-center gap-1"
                                        title="Skip voice response"
                                    >
                                        ⏭️ Skip
                                    </button>
                                ) : (
                                    <div className="text-xs text-gray-400">No skip callback</div>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-typing-enhanced"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-typing-enhanced" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-typing-enhanced" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {!autoScroll && messages.length > 2 && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110 z-10"
                    title="Scroll to bottom"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}

            {/* Chat Input Section */}
            <div className="chat-input-section">
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="leetmentor-input w-full resize-none"
                            placeholder="💬 Type your interview response here..."
                            rows={1}
                            disabled={!onSendMessage}
                        />
                        {inputValue.trim() && (
                            <div className="absolute top-2 right-3 text-xs text-gray-400 font-mono">
                                {inputValue.length}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || !onSendMessage}
                        className="send-button"
                        title="Send message (Enter)"
                    >
                        <span className="text-lg font-bold">➤</span>
                    </button>
                </div>

                {/* Voice Speed Controls */}
                {onSpeedChange && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                <span className="text-blue-500">🎵</span>
                                <span>Voice Speed:</span>
                            </div>
                            <div className="flex gap-1">
                                {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(speed => (
                                    <button
                                        key={speed}
                                        onClick={() => {
                                            setSelectedSpeed(speed);
                                            onSpeedChange(speed);
                                        }}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${Math.abs(selectedSpeed - speed) < 0.01
                                            ? 'bg-blue-500 text-white shadow-sm'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                            }`}
                                        title={`Set voice speed to ${speed}x`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Enhanced Voice Controls Hint */}
                <div className="mt-3 flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <span className="text-blue-500">💡</span>
                        <span>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">Enter</kbd> to send</span>
                        <span className="text-gray-400">•</span>
                        <span className={isListening ? "text-red-600 font-semibold" : ""}>
                            Hold <kbd className={`px-1 py-0.5 rounded text-xs font-mono ${isListening ? 'bg-red-200 border border-red-400' : 'bg-gray-200'}`}>Space</kbd> for voice
                            {isListening && <span className="ml-1 text-red-600">🎤 Listening...</span>}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500">
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded font-mono">Esc</kbd> to {isListening ? 'stop voice' : 'unfocus'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
