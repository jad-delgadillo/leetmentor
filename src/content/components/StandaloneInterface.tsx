import React, { useState, useEffect } from 'react';
import InterviewHeader from './InterviewHeader';
import ProblemInfo from './ProblemInfo';
import ActionButtons from './ActionButtons';
import ChatInterface from './ChatInterface';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Problem {
    id: string;
    title: string;
    titleSlug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    description?: string;
    url?: string;
}

interface StandaloneInterfaceProps {
    problem?: Problem;
    onSendMessage?: (message: string) => void;
    onStartInterview?: () => void;
    onSettingsClick?: () => void;
    onClearChat?: () => void;
    onExportChat?: () => void;
    onStartVoiceInput?: () => void;
    onStopVoiceInput?: () => void;
    onSkipVoice?: () => void;
    onSpeedChange?: (speed: number) => void;
    currentSpeed?: number;
    messages?: ChatMessage[];
    isInterviewActive?: boolean;
    isTyping?: boolean;
    isListening?: boolean;
}

const StandaloneInterface: React.FC<StandaloneInterfaceProps> = ({
    problem,
    onSendMessage,
    onStartInterview,
    onSettingsClick,
    onClearChat,
    onExportChat,
    onStartVoiceInput,
    onStopVoiceInput,
    onSkipVoice,
    onSpeedChange,
    currentSpeed = 1.0,
    messages = [],
    isInterviewActive = false,
    isTyping = false,
    isListening = false
}) => {
    console.log('🔧 StandaloneInterface called with:', {
        problem,
        problemTitle: problem?.title,
        messagesCount: messages.length,
        isInterviewActive,
        isTyping,
        isListening,
        hasSkipVoice: !!onSkipVoice
    });

    // State for current problem to handle updates
    const [currentProblem, setCurrentProblem] = useState(problem);

    // Update current problem when prop changes
    useEffect(() => {
        console.log('🔄 Problem prop updated:', problem?.title);
        setCurrentProblem(problem);
    }, [problem]);

    const handleStartInterview = () => {
        if (onStartInterview) {
            onStartInterview();
        }
    };

    const handleSettingsClick = () => {
        if (onSettingsClick) {
            onSettingsClick();
        }
    };

    const handleClearChat = () => {
        if (onClearChat) {
            onClearChat();
        }
    };

    const handleExportChat = () => {
        if (onExportChat) {
            onExportChat();
        }
    };

    const handleSendMessage = (message: string) => {
        if (onSendMessage) {
            onSendMessage(message);
        }
    };

    return (
        <div className="
            leetmentor-card relative z-50 overflow-hidden m-6 
            bg-gradient-to-br from-white via-white to-gray-50/50
            animate-fade-in-scale
        ">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-purple-500/2 to-green-500/3 pointer-events-none"></div>

            {/* Main content */}
            <div className="relative z-10">
                <InterviewHeader
                    status={isInterviewActive ? 'active' : 'ready'}
                    onSettingsClick={handleSettingsClick}
                />

                <ProblemInfo
                    title={currentProblem?.title || 'Loading...'}
                    difficulty={currentProblem?.difficulty || 'Medium'}
                />

                <ActionButtons
                    onStartInterview={handleStartInterview}
                    onSettingsClick={handleSettingsClick}
                    isInterviewActive={isInterviewActive}
                />

                {/* Conditional Chat Interface with smooth transition */}
                <div className={`transition-all duration-300 ease-in-out ${isInterviewActive
                    ? 'opacity-100 max-h-none overflow-visible'
                    : 'opacity-0 max-h-0 overflow-hidden'
                    }`}>
                    <ChatInterface
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        onClearChat={handleClearChat}
                        onExportChat={handleExportChat}
                        onStartVoiceInput={onStartVoiceInput}
                        onStopVoiceInput={onStopVoiceInput}
                        onSkipVoice={onSkipVoice}
                        onSpeedChange={onSpeedChange}
                        currentSpeed={currentSpeed}
                        isVisible={isInterviewActive}
                        isTyping={isTyping}
                        isListening={isListening}
                    />
                </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-60"></div>
        </div>
    );
};

export default StandaloneInterface;
