import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Check, X, Code, Maximize2, Minimize2 } from 'lucide-react';
import { LeetCodeProblem } from '../../types/leetcode';

interface CodeEditorProps {
    problem: LeetCodeProblem;
    onSubmitCode: (code: string, language: string) => void;
    onClose: () => void;
    isVisible: boolean;
    initialCode?: string;
    language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
    problem,
    onSubmitCode,
    onClose,
    isVisible,
    initialCode = '',
    language = 'javascript'
}) => {
    const [code, setCode] = useState(initialCode);
    const [selectedLanguage, setSelectedLanguage] = useState(language);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const editorRef = useRef<any>(null);

    // Language templates for different problem types
    const getInitialTemplate = (lang: string, problem: LeetCodeProblem): string => {
        const templates: Record<string, string> = {
            javascript: `/**
 * ${problem.title}
 * ${problem.difficulty} - ${problem.description.substring(0, 100)}...
 */

function solution() {
    // Your solution here
    
}

// Test your solution
console.log(solution());`,

            python: `"""
${problem.title}
${problem.difficulty} - ${problem.description.substring(0, 100)}...
"""

def solution():
    # Your solution here
    pass

# Test your solution
print(solution())`,

            java: `/**
 * ${problem.title}
 * ${problem.difficulty} - ${problem.description.substring(0, 100)}...
 */

public class Solution {
    public int solution() {
        // Your solution here
        return 0;
    }
    
    public static void main(String[] args) {
        Solution sol = new Solution();
        System.out.println(sol.solution());
    }
}`,

            cpp: `/**
 * ${problem.title}
 * ${problem.difficulty} - ${problem.description.substring(0, 100)}...
 */

#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    int solution() {
        // Your solution here
        return 0;
    }
};

int main() {
    Solution sol;
    cout << sol.solution() << endl;
    return 0;
}`
        };

        return templates[lang] || templates.javascript;
    };

    // Initialize code when language changes
    useEffect(() => {
        if (!code || code === initialCode) {
            setCode(getInitialTemplate(selectedLanguage, problem));
        }
    }, [selectedLanguage, problem]);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;

        // Configure editor for better coding experience
        editor.updateOptions({
            fontSize: 14,
            minimap: { enabled: isFullscreen },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            tabSize: 2,
            insertSpaces: true,
            automaticLayout: true
        });

        // Add keyboard shortcuts - Ctrl+Enter to submit
        if (typeof (window as any).monaco !== 'undefined') {
            const monacoInstance = (window as any).monaco;
            editor.addCommand(
                monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
                () => handleSubmit()
            );
        }
    };

    const handleSubmit = async () => {
        if (!code.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmitCode(code, selectedLanguage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLanguageChange = (newLanguage: string) => {
        setSelectedLanguage(newLanguage);
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        // Update editor options for fullscreen
        if (editorRef.current) {
            editorRef.current.updateOptions({
                minimap: { enabled: !isFullscreen }
            });
        }
    };

    const languages = [
        { value: 'javascript', label: 'JavaScript', icon: '🟨' },
        { value: 'python', label: 'Python', icon: '🐍' },
        { value: 'java', label: 'Java', icon: '☕' },
        { value: 'cpp', label: 'C++', icon: '⚡' },
        { value: 'typescript', label: 'TypeScript', icon: '🔷' }
    ];

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300 ${isFullscreen ? 'p-0' : 'p-4'
            }`}>
            <div className={`bg-white rounded-lg shadow-2xl transition-all duration-300 ${isFullscreen
                    ? 'w-full h-full rounded-none'
                    : 'w-full max-w-6xl h-[80vh] max-h-[800px]'
                }`}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                    <div className="flex items-center space-x-3">
                        <Code className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Code Editor - {problem.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${problem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                            }`}>
                            {problem.difficulty}
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Language Selector */}
                        <select
                            value={selectedLanguage}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {languages.map(lang => (
                                <option key={lang.value} value={lang.value}>
                                    {lang.icon} {lang.label}
                                </option>
                            ))}
                        </select>

                        {/* Fullscreen Toggle */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            title="Close Editor"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Editor */}
                <div className={`relative ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[calc(80vh-120px)]'}`}>
                    <Editor
                        height="100%"
                        language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage}
                        value={code}
                        onChange={(value) => setCode(value || '')}
                        onMount={handleEditorDidMount}
                        theme="vs-light"
                        options={{
                            fontSize: 14,
                            minimap: { enabled: isFullscreen },
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            lineNumbers: 'on',
                            tabSize: 2,
                            insertSpaces: true,
                            automaticLayout: true,
                            suggestOnTriggerCharacters: true,
                            quickSuggestions: true,
                            parameterHints: { enabled: true },
                            formatOnPaste: true,
                            formatOnType: true
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-600">
                        💡 Press <kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+Enter</kbd> to submit
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !code.trim()}
                            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            <span>{isSubmitting ? 'Submitting...' : 'Submit Code'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodeEditor;
