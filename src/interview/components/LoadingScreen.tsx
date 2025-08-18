import React from 'react';
import { MessageCircle, Code, Mic, Brain } from 'lucide-react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="interview-interface flex items-center justify-center">
            <div className="max-w-md text-center space-y-6">
                {/* Logo */}
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Code className="w-10 h-10 text-white" />
                </div>

                {/* Title */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        LeetMentor Interview
                    </h1>
                    <p className="text-gray-600">
                        Preparing your AI interview experience...
                    </p>
                </div>

                {/* Loading Spinner */}
                <div className="flex justify-center">
                    <div className="w-8 h-8 relative">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                </div>

                {/* Loading Steps */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                        <Brain className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700">Loading problem data...</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700">Initializing AI interviewer...</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                        <Mic className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700">Setting up voice features...</span>
                    </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
                    <h3 className="font-medium text-blue-900 mb-2">Interview Tips:</h3>
                    <ul className="space-y-1 text-blue-800">
                        <li>• Think out loud as you solve the problem</li>
                        <li>• Ask clarifying questions when needed</li>
                        <li>• Discuss your approach before coding</li>
                        <li>• Consider edge cases and optimizations</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
