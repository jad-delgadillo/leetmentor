import React, { useState, useRef, useEffect } from 'react';
import { InterviewMessage } from '../../types/leetcode';
import { Send, Bot, User, Loader, ChevronDown } from 'lucide-react';
import { formatTimestamp } from '../../shared/utils';

interface ChatInterfaceProps {
    messages: InterviewMessage[];
    currentTranscript: string;
    isLoading: boolean;
    onSendMessage: (message: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    currentTranscript,
    isLoading,
    onSendMessage
}) => {
    const [inputValue, setInputValue] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
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

    // Auto-scroll to bottom when new messages arrive (only if user hasn't scrolled up)
    useEffect(() => {
        if (autoScroll && chatContainerRef.current) {
            smoothScrollToBottom(250);
        }
    }, [messages, currentTranscript, autoScroll]);

    // Detect if user has scrolled up
    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
            setAutoScroll(isNearBottom);
        }
    };

    // Scroll to bottom manually
    const scrollToBottom = () => {
        smoothScrollToBottom(250);
        setAutoScroll(true);
    };

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [inputValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() && !isLoading) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div
            className="h-full flex flex-col bg-gray-50 relative"
            style={{ contain: 'layout style paint' }} // Prevent layout shifts
        >
            {/* Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
                onScroll={handleScroll}
            >
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'candidate' ? 'justify-end' : 'justify-start'
                            }`}
                    >
                        <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${message.role === 'candidate'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-gray-200 text-gray-900'
                                }`}
                        >
                            {/* Message Header */}
                            <div className="flex items-center space-x-2 mb-1">
                                <div className="flex items-center space-x-1">
                                    {message.role === 'candidate' ? (
                                        <User className="w-3 h-3" />
                                    ) : (
                                        <Bot className="w-3 h-3" />
                                    )}
                                    <span className={`text-xs font-medium ${message.role === 'candidate' ? 'text-blue-100' : 'text-gray-500'
                                        }`}>
                                        {message.role === 'candidate' ? 'You' : 'AI Interviewer'}
                                    </span>
                                </div>
                                <span className={`text-xs ${message.role === 'candidate' ? 'text-blue-200' : 'text-gray-400'
                                    }`}>
                                    {formatTimestamp(message.timestamp)}
                                </span>
                            </div>

                            {/* Message Content */}
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content}
                            </div>

                            {/* Voice indicator */}
                            {message.type === 'voice' && (
                                <div className="flex items-center space-x-1 mt-2">
                                    <div className="w-2 h-2 bg-current rounded-full opacity-60" />
                                    <span className={`text-xs ${message.role === 'candidate' ? 'text-blue-200' : 'text-gray-400'
                                        }`}>
                                        Voice message
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Current transcript (real-time speech recognition) */}
                {currentTranscript && (
                    <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-blue-200 text-blue-900 border-2 border-blue-300 border-dashed">
                            <div className="flex items-center space-x-2 mb-1">
                                <User className="w-3 h-3" />
                                <span className="text-xs font-medium text-blue-700">
                                    Speaking...
                                </span>
                            </div>
                            <div className="text-sm leading-relaxed">
                                {currentTranscript}
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-white border border-gray-200">
                            <div className="flex items-center space-x-2 mb-1">
                                <Bot className="w-3 h-3 text-gray-500" />
                                <span className="text-xs font-medium text-gray-500">
                                    AI Interviewer
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Loader className="w-4 h-4 animate-spin text-gray-400" />
                                <span className="text-sm text-gray-500">
                                    Thinking...
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            {!autoScroll && messages.length > 2 && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                    title="Scroll to bottom"
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4">
                <form onSubmit={handleSubmit} className="flex space-x-3">
                    <div className="flex-1">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your response or use voice input..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-32"
                            disabled={isLoading}
                            rows={1}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        className="btn-primary px-4 py-2 h-fit disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>

                {/* Help text */}
                <div className="mt-2 text-xs text-gray-500 text-center">
                    Press Enter to send • Shift+Enter for new line
                    {currentTranscript && ' • Voice input detected'}
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
