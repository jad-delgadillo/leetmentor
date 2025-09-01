import React, { useState, useEffect } from 'react';
import { LeetCodeProblem, InterviewSession } from '../../types/leetcode';
import { ExtensionConfig } from '../../types/api';
import { sendMessage, storage } from '../../shared/utils';
import WelcomeScreen from './WelcomeScreen';
import ProblemDetected from './ProblemDetected';
import InterviewSettings from './InterviewSettings';
import SettingsScreen from './SettingsScreen';
import LoadingScreen from './LoadingScreen';

interface PopupState {
    screen: 'loading' | 'welcome' | 'problem-detected' | 'settings' | 'interview-settings';
    problem: LeetCodeProblem | null;
    config: ExtensionConfig | null;
    isOnLeetCode: boolean;
}

const PopupApp: React.FC = () => {
    const [state, setState] = useState<PopupState>({
        screen: 'loading',
        problem: null,
        config: null,
        isOnLeetCode: false
    });

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            // Get current config
            const config = await getConfig();

            // Check if we're on LeetCode and detect problem
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const isOnLeetCode = tab.url?.includes('leetcode.com/problems/') || false;

            let problem: LeetCodeProblem | null = null;
            if (isOnLeetCode) {
                try {
                    const response = await sendMessage({ type: 'DETECT_PROBLEM' });
                    problem = response.success ? response.data : null;
                } catch (error) {
                    console.log('Could not detect problem - content script may not be ready');
                }
            }

            // Determine initial screen
            let screen: PopupState['screen'] = 'welcome';
            if (!config.apiKey) {
                screen = 'settings';
            } else if (problem) {
                screen = 'problem-detected';
            }

            setState({
                screen,
                problem,
                config,
                isOnLeetCode
            });
        } catch (error) {
            console.error('Failed to initialize popup:', error);
            setState(prev => ({ ...prev, screen: 'welcome' }));
        }
    };

    const getConfig = async (): Promise<ExtensionConfig> => {
        try {
            const response = await sendMessage({ type: 'GET_CONFIG' });
            return response.success ? response.data : getDefaultConfig();
        } catch (error) {
            return getDefaultConfig();
        }
    };

    const getDefaultConfig = (): ExtensionConfig => ({
        apiKey: '',
        model: 'gpt-4o',
        voice: {
            enabled: true,
            language: 'en-US',
            rate: 1,
            pitch: 1,
            volume: 1
        },
        speechRecognition: {
            enabled: true,
            language: 'en-US',
            continuous: true,
            interimResults: true
        },
        interviewMode: 'intermediate',
        practiceAreas: ['algorithms', 'data-structures']
    });

    const updateConfig = async (newConfig: Partial<ExtensionConfig>) => {
        try {
            const updatedConfig = { ...state.config!, ...newConfig };
            await sendMessage({
                type: 'UPDATE_CONFIG',
                data: { config: updatedConfig }
            });
            setState(prev => ({ ...prev, config: updatedConfig }));
        } catch (error) {
            console.error('Failed to update config:', error);
        }
    };

    const startInterview = async () => {
        if (!state.problem) return;

        try {
            const response = await sendMessage({
                type: 'START_INTERVIEW',
                data: { problem: state.problem }
            });

            if (response.success) {
                // Open interview interface in new tab
                const interviewUrl = chrome.runtime.getURL('interview.html');
                await chrome.tabs.create({
                    url: `${interviewUrl}?sessionId=${response.data.id}`
                });

                // Close popup
                window.close();
            }
        } catch (error) {
            console.error('Failed to start interview:', error);
        }
    };

    const navigateToScreen = (screen: PopupState['screen']) => {
        setState(prev => ({ ...prev, screen }));
    };

    if (state.screen === 'loading') {
        return <LoadingScreen />;
    }

    return (
        <div className="extension-popup">
            {state.screen === 'welcome' && (
                <WelcomeScreen
                    isOnLeetCode={state.isOnLeetCode}
                    hasApiKey={!!state.config?.apiKey}
                    onNavigateToSettings={() => navigateToScreen('settings')}
                    onRefresh={initializeApp}
                />
            )}

            {state.screen === 'problem-detected' && state.problem && (
                <ProblemDetected
                    problem={state.problem}
                    onStartInterview={() => navigateToScreen('interview-settings')}
                    onSettings={() => navigateToScreen('settings')}
                />
            )}

            {state.screen === 'interview-settings' && state.problem && state.config && (
                <InterviewSettings
                    problem={state.problem}
                    config={state.config}
                    onUpdateConfig={updateConfig}
                    onStartInterview={startInterview}
                    onBack={() => navigateToScreen('problem-detected')}
                />
            )}

            {state.screen === 'settings' && state.config && (
                <SettingsScreen
                    config={state.config}
                    onUpdateConfig={updateConfig}
                    onBack={() => navigateToScreen(state.problem ? 'problem-detected' : 'welcome')}
                />
            )}
        </div>
    );
};

export default PopupApp;
