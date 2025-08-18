import React, { useState, useEffect, useCallback } from 'react';
import { LeetCodeProblem, InterviewSession, InterviewMessage } from '../../types/leetcode';
import { ExtensionConfig, ChatGPTMessage } from '../../types/api';
import { VoiceService } from '../../shared/voice-service';
import { ChatGPTService } from '../../shared/chatgpt-service';
import { generateId, sendMessage } from '../../shared/utils';
import { INTERVIEW_PROMPTS } from '../../shared/constants';

import InterviewHeader from './InterviewHeader';
import ProblemPanel from './ProblemPanel';
import ChatInterface from './ChatInterface';
import VoiceControls from './VoiceControls';
import InterviewControls from './InterviewControls';
import LoadingScreen from './LoadingScreen';

interface InterviewState {
    status: 'loading' | 'ready' | 'active' | 'paused' | 'completed' | 'error';
    session: InterviewSession | null;
    problem: LeetCodeProblem | null;
    config: ExtensionConfig | null;
    messages: InterviewMessage[];
    chatHistory: ChatGPTMessage[];
    isAiSpeaking: boolean;
    isUserSpeaking: boolean;
    currentTranscript: string;
    error: string | null;
}

const InterviewApp: React.FC = () => {
    const [state, setState] = useState<InterviewState>({
        status: 'loading',
        session: null,
        problem: null,
        config: null,
        messages: [],
        chatHistory: [],
        isAiSpeaking: false,
        isUserSpeaking: false,
        currentTranscript: '',
        error: null
    });

    const [voiceService] = useState(() => new VoiceService());
    const [chatService, setChatService] = useState<ChatGPTService | null>(null);

    // Initialize the interview session
    useEffect(() => {
        initializeInterview();
        return () => {
            voiceService.destroy();
        };
    }, []);

    // Note: Voice service setup moved below handleUserMessage declaration

    const initializeInterview = async () => {
        try {
            // Get session ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('sessionId');

            if (!sessionId) {
                throw new Error('No session ID provided');
            }

            // Get session data from storage
            const sessionData = await chrome.storage.local.get([`session_${sessionId}`]);
            let session = sessionData[`session_${sessionId}`];

            if (!session) {
                throw new Error('Session not found');
            }

            // Fix date serialization issue - convert string dates back to Date objects
            if (typeof session.startTime === 'string') {
                session.startTime = new Date(session.startTime);
            }
            if (session.endTime && typeof session.endTime === 'string') {
                session.endTime = new Date(session.endTime);
            }

            // Convert message timestamps back to Date objects
            if (session.transcript) {
                session.transcript = session.transcript.map((msg: any) => ({
                    ...msg,
                    timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
                }));
            }

            // Get configuration
            const configResponse = await sendMessage({ type: 'GET_CONFIG' });
            const config = configResponse.success ? configResponse.data : null;

            if (!config || !config.apiKey) {
                throw new Error('API key not configured');
            }

            // Get problem data from storage (stored by content script)
            const problemData = await chrome.storage.local.get(['leetmentor_current_problem']);
            const problem = problemData.leetmentor_current_problem;

            console.log('LeetMentor Interview: Retrieved problem data:', problem);

            if (!problem) {
                throw new Error('Could not find problem data. Please make sure you started the interview from a LeetCode problem page.');
            }

            // Initialize ChatGPT service
            const chatGPT = new ChatGPTService(config.apiKey, config.model);
            setChatService(chatGPT);

            // Configure voice service with OpenAI API key for natural voices
            voiceService.setApiKey(config.apiKey);
            voiceService.setUseOpenAIVoice(true);

            // Start with welcome message
            const welcomeMessage: InterviewMessage = {
                id: generateId('msg'),
                timestamp: new Date(),
                role: 'interviewer',
                content: INTERVIEW_PROMPTS.WELCOME_MESSAGE,
                type: 'text'
            };

            const initialChatHistory: ChatGPTMessage[] = [
                {
                    role: 'system',
                    content: `${INTERVIEW_PROMPTS.SYSTEM_PROMPT}

Current Problem:
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Description: ${problem.description}`
                }
            ];

            setState({
                status: 'active', // Changed from 'ready' to 'active' so interview can proceed
                session,
                problem,
                config,
                messages: [welcomeMessage],
                chatHistory: initialChatHistory,
                isAiSpeaking: false,
                isUserSpeaking: false,
                currentTranscript: '',
                error: null
            });

            // Speak welcome message if voice is enabled
            if (config.voice.enabled) {
                await voiceService.speak(welcomeMessage.content, config.voice);
            }

            // Update session status
            await sendMessage({
                type: 'SAVE_MESSAGE',
                data: { sessionId, message: welcomeMessage }
            });

        } catch (error) {
            console.error('Failed to initialize interview:', error);
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Failed to initialize interview'
            }));
        }
    };

    const handleUserMessage = useCallback(async (content: string) => {
        console.log('LeetMentor: handleUserMessage called with:', content);
        console.log('LeetMentor: Current state check:', {
            hasSession: !!state.session,
            hasProblem: !!state.problem,
            hasConfig: !!state.config,
            hasChatService: !!chatService,
            sessionId: state.session?.id,
            problemTitle: state.problem?.title,
            configApiKey: state.config?.apiKey ? 'present' : 'missing'
        });

        if (!state.session || !state.problem || !state.config || !chatService) {
            console.log('LeetMentor: Missing required data for handleUserMessage:', {
                session: !!state.session,
                problem: !!state.problem,
                config: !!state.config,
                chatService: !!chatService
            });
            return;
        }

        try {
            // Add user message
            const userMessage: InterviewMessage = {
                id: generateId('msg'),
                timestamp: new Date(),
                role: 'candidate',
                content,
                type: 'text'
            };

            setState(prev => ({
                ...prev,
                messages: [...prev.messages, userMessage]
            }));

            // Save user message
            await sendMessage({
                type: 'SAVE_MESSAGE',
                data: { sessionId: state.session.id, message: userMessage }
            });

            // Get AI response
            const updatedChatHistory = [
                ...state.chatHistory,
                { role: 'user' as const, content }
            ];

            const aiResponse = await chatService.generateInterviewResponse(
                state.problem,
                updatedChatHistory,
                content
            );

            // Add AI message
            const aiMessage: InterviewMessage = {
                id: generateId('msg'),
                timestamp: new Date(),
                role: 'interviewer',
                content: aiResponse,
                type: 'text'
            };

            setState(prev => ({
                ...prev,
                messages: [...prev.messages, aiMessage],
                chatHistory: [
                    ...updatedChatHistory,
                    { role: 'assistant', content: aiResponse }
                ]
            }));

            // Save AI message
            await sendMessage({
                type: 'SAVE_MESSAGE',
                data: { sessionId: state.session.id, message: aiMessage }
            });

            // Speak AI response if voice is enabled
            if (state.config.voice.enabled) {
                await voiceService.speak(aiResponse, state.config.voice);
            }

        } catch (error) {
            console.error('Failed to handle user message:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to get AI response. Please try again.'
            }));
        }
    }, [state.session, state.problem, state.config, state.chatHistory, chatService, voiceService]);

    // Setup voice service events (moved here after handleUserMessage declaration)
    useEffect(() => {
        if (!voiceService) return;

        voiceService.onSpeechResultReceived((text, isFinal) => {
            setState(prev => ({ ...prev, currentTranscript: text }));
            if (isFinal && text.trim()) {
                console.log('LeetMentor: Final speech result received:', text);
                handleUserMessage(text.trim());
                setState(prev => ({ ...prev, currentTranscript: '' }));
            }
        });

        voiceService.onSpeechStarted(() => {
            setState(prev => ({ ...prev, isUserSpeaking: true }));
        });

        voiceService.onSpeechEnded(() => {
            setState(prev => ({ ...prev, isUserSpeaking: false }));
        });

        voiceService.onSpeakStarted(() => {
            setState(prev => ({ ...prev, isAiSpeaking: true }));
        });

        voiceService.onSpeakEnded(() => {
            setState(prev => ({ ...prev, isAiSpeaking: false }));
        });

        voiceService.onSpeechErrorOccurred((error) => {
            console.error('Speech error:', error);
            setState(prev => ({
                ...prev,
                error: `Speech recognition error: ${error}`,
                isUserSpeaking: false
            }));
        });
    }, [voiceService, handleUserMessage]);

    const startListening = () => {
        if (!state.config?.speechRecognition.enabled) return;

        try {
            voiceService.startListening(state.config.speechRecognition);
        } catch (error) {
            console.error('Failed to start listening:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to start speech recognition'
            }));
        }
    };

    const stopListening = () => {
        voiceService.stopListening();
    };

    const stopSpeaking = () => {
        voiceService.stopSpeaking();
    };

    const pauseInterview = async () => {
        if (state.session) {
            setState(prev => ({ ...prev, status: 'paused' }));
            stopListening();
            stopSpeaking();
        }
    };

    const resumeInterview = () => {
        setState(prev => ({ ...prev, status: 'active' }));
    };

    const endInterview = async () => {
        if (state.session) {
            await sendMessage({
                type: 'END_INTERVIEW',
                data: { sessionId: state.session.id }
            });
            setState(prev => ({ ...prev, status: 'completed' }));
            stopListening();
            stopSpeaking();
        }
    };

    if (state.status === 'loading') {
        return <LoadingScreen />;
    }

    if (state.status === 'error') {
        return (
            <div className="interview-interface flex items-center justify-center">
                <div className="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Interview Error</h2>
                    <p className="text-gray-700 mb-4">{state.error}</p>
                    <button
                        onClick={() => window.close()}
                        className="btn-secondary"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="interview-interface h-screen flex flex-col">
            <InterviewHeader
                problem={state.problem}
                session={state.session}
                status={state.status}
                onPause={pauseInterview}
                onResume={resumeInterview}
                onEnd={endInterview}
            />

            <div className="flex-1 flex">
                {/* Problem Panel */}
                <div className="w-1/2 border-r border-gray-200">
                    <ProblemPanel problem={state.problem} />
                </div>

                {/* Chat Interface */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex-1">
                        <ChatInterface
                            messages={state.messages}
                            currentTranscript={state.currentTranscript}
                            isLoading={state.isAiSpeaking}
                            onSendMessage={handleUserMessage}
                        />
                    </div>

                    {/* Voice Controls */}
                    {state.config?.voice.enabled && (
                        <VoiceControls
                            isListening={state.isUserSpeaking}
                            isSpeaking={state.isAiSpeaking}
                            isEnabled={state.config.speechRecognition.enabled}
                            onStartListening={startListening}
                            onStopListening={stopListening}
                            onStopSpeaking={stopSpeaking}
                        />
                    )}

                    {/* Interview Controls */}
                    <InterviewControls
                        status={state.status}
                        onPause={pauseInterview}
                        onResume={resumeInterview}
                        onEnd={endInterview}
                    />
                </div>
            </div>
        </div>
    );
};

export default InterviewApp;
