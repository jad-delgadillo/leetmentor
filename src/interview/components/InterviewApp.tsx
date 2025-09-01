import React, { useState, useEffect, useCallback } from 'react';
import { LeetCodeProblem, InterviewSession, InterviewMessage } from '../../types/leetcode';
import { ExtensionConfig, ChatGPTMessage } from '../../types/api';
import { VoiceService } from '../../shared/voice-service';
import { RealtimeVoiceService } from '../../shared/realtime-voice-service';
import { ChatGPTService } from '../../shared/chatgpt-service';
import { generateId, sendMessage } from '../../shared/utils';
import { INTERVIEW_PROMPTS } from '../../shared/constants';

import InterviewHeader from './InterviewHeader';
import ProblemPanel from './ProblemPanel';
import ChatInterface from './ChatInterface';
import VoiceControls from './VoiceControls';
import InterviewControls from './InterviewControls';
import LoadingScreen from './LoadingScreen';
import SimpleCodeEditor from './SimpleCodeEditor';
import ResizablePanel from './ResizablePanel';
import SplitPanel from './SplitPanel';

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
    showCodeEditor: boolean;
    submittedCode: string | null;
    codeLanguage: string;
    speechRate: number;
    useRealtimeAPI: boolean;
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
        error: null,
        showCodeEditor: false,
        submittedCode: null,
        codeLanguage: 'javascript',
        speechRate: 1.0,
        useRealtimeAPI: false // Default to traditional voice (Realtime API requires server setup)
    });

    const [voiceService] = useState(() => new VoiceService());
    const [realtimeService] = useState(() => new RealtimeVoiceService());
    const [chatService, setChatService] = useState<ChatGPTService | null>(null);

    // Initialize the interview session
    useEffect(() => {
        initializeInterview();
        return () => {
            voiceService.destroy();
            realtimeService.disconnect();
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
            const problemData = await chrome.storage.local.get(['leetmentor_current_problem', 'leetmentor_problem_timestamp']);
            const problem = problemData.leetmentor_current_problem;
            const problemTimestamp = problemData.leetmentor_problem_timestamp;

            console.log('LeetMentor Interview: Retrieved problem data:', problem);
            console.log('LeetMentor Interview: Problem cached at:', problemTimestamp ? new Date(problemTimestamp) : 'unknown');

            if (!problem) {
                throw new Error('Could not find problem data. Please make sure you started the interview from a LeetCode problem page.');
            }

            // Check cache freshness (warn if older than 5 minutes)
            if (problemTimestamp) {
                const cacheAge = Date.now() - problemTimestamp;
                const maxCacheAge = 5 * 60 * 1000; // 5 minutes

                if (cacheAge > maxCacheAge) {
                    console.warn('LeetMentor Interview: Problem data is', Math.round(cacheAge / 60000), 'minutes old. Consider refreshing the LeetCode page.');
                }
            }

            // Initialize ChatGPT service
            const chatGPT = new ChatGPTService(config.apiKey, config.model);
            setChatService(chatGPT);

            // Configure voice service with OpenAI API key for natural voices and better accent recognition
            voiceService.setApiKey(config.apiKey);
            voiceService.setUseOpenAIVoice(true);
            voiceService.setUseOpenAIWhisper(true); // Use Whisper for better accent support

            // Configure Realtime Voice Service for ChatGPT-level experience
            realtimeService.setApiKey(config.apiKey);
            realtimeService.setEventHandlers({
                onSpeechResult: (text: string, isFinal: boolean) => {
                    console.log('LeetMentor Realtime: Speech result:', text, 'Final:', isFinal);
                    setState(prev => ({
                        ...prev,
                        currentTranscript: isFinal ? '' : text
                    }));

                    if (isFinal && text.trim()) {
                        handleUserMessage(text.trim());
                    }
                },
                onSpeechStart: () => {
                    console.log('LeetMentor Realtime: User started speaking');
                    setState(prev => ({
                        ...prev,
                        isUserSpeaking: true
                    }));
                },
                onSpeechEnd: () => {
                    console.log('LeetMentor Realtime: User stopped speaking');
                    setState(prev => ({
                        ...prev,
                        isUserSpeaking: false
                    }));
                },
                onSpeakStart: () => {
                    console.log('LeetMentor Realtime: AI started speaking');
                    setState(prev => ({
                        ...prev,
                        isAiSpeaking: true
                    }));
                },
                onSpeakEnd: () => {
                    console.log('LeetMentor Realtime: AI stopped speaking');
                    setState(prev => ({
                        ...prev,
                        isAiSpeaking: false
                    }));
                },
                onSpeechError: (error: string) => {
                    console.error('LeetMentor Realtime: Speech error:', error);
                    setState(prev => ({
                        ...prev,
                        error: `Voice error: ${error}`
                    }));
                }
            });

            // Start with welcome message (dynamic based on problem)
            const welcomeContent = INTERVIEW_PROMPTS.WELCOME_MESSAGE
                .replace('{difficulty}', problem.difficulty.toLowerCase())
                .replace('{title}', problem.title);

            const welcomeMessage: InterviewMessage = {
                id: generateId('msg'),
                timestamp: new Date(),
                role: 'interviewer',
                content: welcomeContent,
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
                error: null,
                showCodeEditor: false,
                submittedCode: null,
                codeLanguage: 'javascript',
                speechRate: 1.0,
                useRealtimeAPI: false
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

        if (!state.session || !state.problem || !state.config) {
            console.log('LeetMentor: Missing required data for handleUserMessage:', {
                session: !!state.session,
                problem: !!state.problem,
                config: !!state.config,
                chatService: !!chatService
            });
            return;
        }

        // For traditional voice mode, we need ChatGPT service
        if (!state.useRealtimeAPI && !chatService) {
            console.log('LeetMentor: Missing ChatGPT service for traditional mode');
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

            if (state.useRealtimeAPI) {
                // With Realtime API, just send the message - it handles the conversation
                realtimeService.sendTextMessage(content);
                console.log('LeetMentor: Sent message to Realtime API');
            } else {
                // Traditional flow with ChatGPT service
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
                    ],
                    // Check if AI is asking for code
                    showCodeEditor: prev.showCodeEditor || shouldShowCodeEditor(aiResponse)
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

    const startListening = async () => {
        if (!state.config?.speechRecognition.enabled) return;

        try {
            if (state.useRealtimeAPI) {
                // Try Realtime API for ChatGPT-level experience
                try {
                    if (!realtimeService.getIsConnected()) {
                        await realtimeService.connect();
                    }
                    await realtimeService.startListening(state.config.speechRecognition);
                } catch (realtimeError) {
                    console.warn('Realtime API failed, falling back to traditional voice:', realtimeError);
                    // Automatically fall back to traditional voice
                    setState(prev => ({
                        ...prev,
                        useRealtimeAPI: false
                    }));
                    await voiceService.startListening(state.config.speechRecognition);
                }
            } else {
                // Use traditional voice service
                await voiceService.startListening(state.config.speechRecognition);
            }
        } catch (error) {
            console.error('Failed to start listening:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to start speech recognition'
            }));
        }
    };

    const stopListening = () => {
        if (state.useRealtimeAPI) {
            realtimeService.stopListening();
        } else {
            voiceService.stopListening();
        }
    };

    const stopSpeaking = () => {
        if (state.useRealtimeAPI) {
            realtimeService.stopSpeaking();
        } else {
            voiceService.stopSpeaking();
        }
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

    // Code Editor Functions - Only trigger on explicit coding requests
    const shouldShowCodeEditor = (aiResponse: string): boolean => {
        const explicitCodingPhrases = [
            'can you code',
            'show me your code',
            'write the code',
            'implement this',
            'write a function',
            'write a method',
            'code this up',
            'let me see your implementation',
            'go ahead and code',
            'show me the implementation',
            'can you implement',
            'please code',
            'write your solution',
            'implement your solution'
        ];

        const response = aiResponse.toLowerCase();
        return explicitCodingPhrases.some(phrase => response.includes(phrase));
    };

    const handleCodeSubmission = async (code: string, language: string) => {
        if (!state.session || !chatService) {
            console.error('LeetMentor: Missing required data for code submission');
            return;
        }

        try {
            // Update state with submitted code
            setState(prev => ({
                ...prev,
                submittedCode: code,
                codeLanguage: language,
                showCodeEditor: false
            }));

            // Create a code submission message
            const codeMessage: InterviewMessage = {
                id: generateId('msg'),
                timestamp: new Date(),
                role: 'candidate',
                content: `**Code Submission (${language}):**\n\`\`\`${language}\n${code}\n\`\`\``,
                type: 'text'
            };

            setState(prev => ({
                ...prev,
                messages: [...prev.messages, codeMessage]
            }));

            // Save code message
            await sendMessage({
                type: 'SAVE_MESSAGE',
                data: { sessionId: state.session.id, message: codeMessage }
            });

            // Get AI review of the code
            const codeReviewPrompt = `Here's my solution:\n\`\`\`${language}\n${code}\n\`\`\`\n\nPlease review this code and provide feedback.`;

            const updatedChatHistory = [
                ...state.chatHistory,
                { role: 'user' as const, content: codeReviewPrompt }
            ];

            const aiResponse = await chatService.generateInterviewResponse(
                state.problem,
                updatedChatHistory,
                codeReviewPrompt
            );

            // Add AI review message
            const reviewMessage: InterviewMessage = {
                id: generateId('msg'),
                timestamp: new Date(),
                role: 'interviewer',
                content: aiResponse,
                type: 'text'
            };

            setState(prev => ({
                ...prev,
                messages: [...prev.messages, reviewMessage],
                chatHistory: [
                    ...updatedChatHistory,
                    { role: 'assistant', content: aiResponse }
                ]
            }));

            // Save AI review
            await sendMessage({
                type: 'SAVE_MESSAGE',
                data: { sessionId: state.session.id, message: reviewMessage }
            });

            // Speak the AI review if voice is enabled
            if (state.config?.voice.enabled && voiceService) {
                await voiceService.speak(aiResponse, state.config.voice);
            }

        } catch (error) {
            console.error('Error submitting code:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to submit code for review'
            }));
        }
    };

    const closeCodeEditor = () => {
        setState(prev => ({
            ...prev,
            showCodeEditor: false
        }));
    };

    const openCodeEditor = () => {
        setState(prev => ({
            ...prev,
            showCodeEditor: true
        }));
    };

    const handleSpeechRateChange = (rate: number) => {
        setState(prev => ({
            ...prev,
            speechRate: rate
        }));
        voiceService.setSpeechRate(rate);
    };

    const toggleRealtimeAPI = () => {
        const newMode = !state.useRealtimeAPI;

        setState(prev => ({
            ...prev,
            useRealtimeAPI: newMode
        }));

        // Stop current services when switching
        stopListening();
        stopSpeaking();

        if (newMode) {
            console.log('LeetMentor: Attempting to switch to Realtime API (will fallback to traditional if needed)');
        } else {
            console.log('LeetMentor: Switched to Traditional Voice');
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

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Chat Interface */}
                <ResizablePanel
                    title="💬 Interview Chat"
                    initialWidth={40}
                    minWidth={30}
                    maxWidth={50}
                    className="border-r border-gray-200"
                >
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-hidden">
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
                                onOpenCodeEditor={openCodeEditor}
                                onSpeechRateChange={handleSpeechRateChange}
                                currentSpeechRate={state.speechRate}
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
                </ResizablePanel>

                {/* Right Panel - Problem and Code Editor */}
                <ResizablePanel
                    title="📋 Problem & Code"
                    initialWidth={60}
                    isResizable={false}
                    canMinimize={false}
                    className="flex-1"
                >
                    <SplitPanel
                        topTitle="📝 Problem Description"
                        bottomTitle="💻 Code Editor"
                        showBottomPanel={state.showCodeEditor}
                        initialTopHeight={state.showCodeEditor ? 40 : 100}
                        minTopHeight={25}
                        maxTopHeight={80}
                        topPanel={<ProblemPanel problem={state.problem} />}
                        bottomPanel={
                            state.showCodeEditor && state.problem ? (
                                <SimpleCodeEditor
                                    problem={state.problem}
                                    onSubmitCode={handleCodeSubmission}
                                    onClose={closeCodeEditor}
                                    isVisible={state.showCodeEditor}
                                    initialCode={state.submittedCode || ''}
                                    language={state.codeLanguage}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>Click the 💚 code button to start coding</p>
                                </div>
                            )
                        }
                    />
                </ResizablePanel>
            </div>
        </div>
    );
};

export default InterviewApp;
