import React, { useState, useRef, useEffect } from 'react';
import {
    Trash2,
    Download,
    Zap,
    Mic,
    User as UserIcon,
    Bot,
    MessageSquare,
    SkipForward,
    Send as SendIcon,
    ChevronDown,
    Lightbulb
} from 'lucide-react';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

type VoiceMode = 'traditional' | 'realtime';

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
    currentTranscript?: string;
    voiceMode?: VoiceMode;
    onToggleVoiceMode?: () => void;
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
    isListening = false,
    currentTranscript,
    voiceMode = 'traditional',
    onToggleVoiceMode
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

    // Add spacebar voice functionality (does not interfere with typing in inputs/textareas)
    useEffect(() => {
        const isEditableTarget = (target: EventTarget | null): boolean => {
            if (!target || !(target as any).closest) return false;
            const el = target as HTMLElement;
            // Inputs, textareas, contenteditable, and common code editors should be ignored
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true;
            if ((el as any).isContentEditable) return true;
            const editableAncestor = el.closest('input, textarea, [contenteditable="true"], .monaco-editor, .editor, .CodeMirror');
            return !!editableAncestor;
        };

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || !isVisible) return;
            // Ignore when typing in editable fields
            if (isEditableTarget(e.target)) return;

            // Prevent page scroll and start voice input only when not already listening
            e.preventDefault();
            e.stopPropagation();
            if ((e.target === document.body || e.target === document.documentElement) &&
                !e.repeat &&
                !isListening) {
                console.log('🎤 Spacebar pressed - Starting voice input');
                onStartVoiceInput?.();
            }
        };

        const handleGlobalKeyUp = (e: KeyboardEvent) => {
            if (!isVisible) return;

            if (e.code === 'Space' && isListening) {
                // Do not block space in inputs on keyup either
                if (!isEditableTarget(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                console.log('🎤 Spacebar released - Stopping voice input');
                onStopVoiceInput?.();
            }

            if (e.code === 'Escape' && isListening) {
                // Escape should not interfere with typing, but safe to prevent default when not in input
                if (!isEditableTarget(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                console.log('🎤 Escape pressed - Force stopping voice input');
                onStopVoiceInput?.();
            }
        };

        if (isVisible) {
            document.addEventListener('keydown', handleGlobalKeyDown, true);
            document.addEventListener('keyup', handleGlobalKeyUp, true);
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
        <div className="flex flex-col overflow-hidden relative">
            {/* Chat Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="status-indicator status-indicator-ready"></div>
                        <div className="text-base font-semibold text-gray-900">
                            Interview Session
                        </div>
                        <div className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClearChat}
                            disabled={messages.length === 0}
                            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-50"
                            title="Clear chat history"
                        >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Clear
                        </button>
                        {onToggleVoiceMode && (
                            <button
                                onClick={onToggleVoiceMode}
                                className="inline-flex items-center justify-center rounded-md border border-purple-600 bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ring-offset-white"
                                title={voiceMode === 'realtime' ? 'Switch to Traditional' : 'Switch to Realtime'}
                            >
                                {voiceMode === 'realtime' ? <Zap className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}
                                {voiceMode === 'realtime' ? 'Realtime' : 'Traditional'}
                            </button>
                        )}
                        <button
                            onClick={onExportChat}
                            disabled={messages.length === 0}
                            className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-50"
                            title="Export chat transcript"
                        >
                            <Download className="mr-1 h-4 w-4" />
                            Export
                        </button>
                    </div>
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
                        <MessageSquare className="w-10 h-10 mb-3 text-gray-400" />
                        <div className="text-gray-600 font-medium">No messages yet</div>
                        <div className="text-sm text-gray-500 mt-1">Start the interview to begin your conversation</div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div key={message.id} className="flex gap-4">
                            <div className={`message-avatar ${message.role === 'user' ? 'message-avatar-user' : 'message-avatar-assistant'}`}>
                                {message.role === 'user' ? (
                                    <UserIcon className="w-5 h-5 text-gray-700" />
                                ) : (
                                    <Bot className="w-5 h-5 text-gray-700" />
                                )}
                            </div>
                            <div className={`flex-1 p-4 rounded-lg border shadow-sm ${message.role === 'user' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-xs font-medium text-gray-600">
                                        {message.role === 'user' ? 'You' : 'AI Interviewer'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatTime(message.timestamp)}
                                    </div>
                                </div>
                                <div className="whitespace-pre-wrap break-words leading-relaxed text-sm text-gray-800">
                                    {message.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Live transcript bubble (user speaking) */}
                {currentTranscript && (
                    <div className="flex gap-4 justify-end">
                        <div className="message-avatar message-avatar-user">
                            <UserIcon className="w-5 h-5 text-gray-700" />
                        </div>
                        <div className="flex-1 p-4 rounded-lg border border-gray-200 bg-white shadow-sm max-w-[80%]">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                    <Mic className="w-3.5 h-3.5" />
                                    Speaking...
                                </div>
                                <div className="text-xs text-gray-500">
                                    live
                                </div>
                            </div>
                            <div className="whitespace-pre-wrap break-words leading-relaxed italic text-sm text-gray-800">
                                {currentTranscript}
                            </div>
                        </div>
                    </div>
                )}

                {/* Enhanced Typing Indicator */}
                {isTyping && (
                    <div className="flex gap-4">
                        <div className="message-avatar message-avatar-assistant">
                            <Bot className="w-5 h-5 text-gray-700" />
                        </div>
                        <div className="flex-1 p-4 rounded-lg border border-gray-200 bg-gray-50 shadow-sm">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="text-xs font-medium text-gray-600">AI Interviewer</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> speaking...</div>
                                </div>
                                {onSkipVoice ? (
                                    <button
                                        onClick={onSkipVoice}
                                        className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors flex items-center gap-1"
                                        title="Skip voice response"
                                    >
                                        <SkipForward className="w-3.5 h-3.5" />
                                        Skip
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
                    className="absolute bottom-20 right-4 bg-white border border-gray-200 text-gray-700 p-2 rounded-full shadow-sm hover:bg-gray-50 transition-colors z-10"
                    aria-label="Scroll to bottom"
                    title="Scroll to bottom"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            )}

            {/* Chat Input Section */}
            <div className="px-6 py-4 bg-white border-t border-gray-200">
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full resize-none rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white min-h-[3.25rem] max-h-32"
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
                        className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-blue-600 w-14 h-14 text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white disabled:pointer-events-none disabled:opacity-50"
                        aria-label="Send message"
                        title="Send message (Enter)"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Voice Speed Controls */}
                {onSpeedChange && (
                    <div className="mt-3 rounded-md border border-gray-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                                <Mic className="w-4 h-4 text-blue-500" />
                                <span>Voice Speed</span>
                            </div>
                            <div className="flex gap-1">
                                {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(speed => (
                                    <button
                                        key={speed}
                                        onClick={() => {
                                            setSelectedSpeed(speed);
                                            onSpeedChange(speed);
                                        }}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${Math.abs(selectedSpeed - speed) < 0.01
                                            ? 'bg-blue-600 text-white border border-blue-600'
                                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
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
                    <div className="flex items-center gap-2 text-gray-600">
                        <Lightbulb className="w-4 h-4 text-blue-500" />
                        <span>Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">Enter</kbd> to send</span>
                        <span className="text-gray-400">•</span>
                        <span className={isListening ? 'text-red-600 font-medium' : ''}>
                            Hold <kbd className={`px-1 py-0.5 rounded text-xs font-mono ${isListening ? 'bg-red-200 border border-red-400' : 'bg-gray-200'}`}>Space</kbd> for voice
                            {isListening && <span className="ml-1 text-red-600 inline-flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Listening...</span>}
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
