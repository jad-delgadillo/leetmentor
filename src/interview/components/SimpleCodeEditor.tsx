import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Code, Minimize2, Maximize2 } from 'lucide-react';
import { LeetCodeProblem } from '../../types/leetcode';

interface SimpleCodeEditorProps {
    problem: LeetCodeProblem;
    onSubmitCode: (code: string, language: string) => void;
    onClose: () => void;
    isVisible: boolean;
    initialCode?: string;
    language?: string;
}

const SimpleCodeEditor: React.FC<SimpleCodeEditorProps> = ({
    problem,
    onSubmitCode,
    onClose,
    isVisible,
    initialCode = '',
    language = 'javascript'
}) => {
    const [code, setCode] = useState(initialCode);
    const [selectedLanguage, setSelectedLanguage] = useState(language);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Language templates for different problem types
    const getInitialTemplate = (lang: string, problem: LeetCodeProblem): string => {
        const templates: Record<string, string> = {
            javascript: `// ${problem.title} - ${problem.difficulty}
function solution() {
    // Your solution here
    
}

// Test your solution
console.log(solution());`,

            python: `# ${problem.title} - ${problem.difficulty}
def solution():
    # Your solution here
    pass

# Test your solution
print(solution())`,

            java: `// ${problem.title} - ${problem.difficulty}
public class Solution {
    public int solution() {
        // Your solution here
        return 0;
    }
}`,

            cpp: `// ${problem.title} - ${problem.difficulty}
#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    int solution() {
        // Your solution here
        return 0;
    }
};`
        };

        return templates[lang] || templates.javascript;
    };

    // Initialize code when language changes or when first loaded
    useEffect(() => {
        if (!code || code === initialCode) {
            setCode(getInitialTemplate(selectedLanguage, problem));
        }
    }, [selectedLanguage, problem]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }

            // Handle tab key for indentation
            if (e.key === 'Tab' && e.target === textareaRef.current) {
                e.preventDefault();
                const textarea = textareaRef.current;
                if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newValue = code.substring(0, start) + '  ' + code.substring(end);
                    setCode(newValue);

                    // Move cursor after the inserted spaces
                    setTimeout(() => {
                        textarea.selectionStart = textarea.selectionEnd = start + 2;
                    }, 0);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [code]);

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

    const languages = [
        { value: 'javascript', label: 'JavaScript', icon: '🟨' },
        { value: 'python', label: 'Python', icon: '🐍' },
        { value: 'java', label: 'Java', icon: '☕' },
        { value: 'cpp', label: 'C++', icon: '⚡' },
        { value: 'typescript', label: 'TypeScript', icon: '🔷' }
    ];

    if (!isVisible) return null;

    return (
        <div className={`bg-white transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-50 bg-white' : 'flex flex-col h-full'
            }`}>

            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                <div className="flex items-center space-x-2">
                    <Code className="w-4 h-4 text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Code Editor</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${problem.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        problem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {problem.difficulty}
                    </span>
                </div>

                <div className="flex items-center space-x-1">
                    {/* Language Selector */}
                    <select
                        value={selectedLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                        {languages.map(lang => (
                            <option key={lang.value} value={lang.value}>
                                {lang.icon} {lang.label}
                            </option>
                        ))}
                    </select>

                    {/* Expand/Collapse */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title={isExpanded ? 'Minimize' : 'Expand'}
                    >
                        {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </button>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title="Close Editor"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Code Editor */}
            <div className="flex-1 min-h-0 relative">
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full p-4 text-sm font-mono border-none resize-none focus:outline-none bg-gray-50"
                    style={{
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                        lineHeight: '1.5',
                        tabSize: 2
                    }}
                    placeholder="Write your solution here..."
                    spellCheck={false}
                />

                {/* Line numbers overlay (simple) */}
                <div className="absolute left-0 top-0 p-4 pointer-events-none text-xs text-gray-400 font-mono select-none">
                    {code.split('\n').map((_, index) => (
                        <div key={index} style={{ lineHeight: '1.5' }}>
                            {(index + 1).toString().padStart(2, ' ')}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-2 border-t bg-gray-50">
                <div className="text-xs text-gray-600">
                    💡 <kbd className="bg-gray-200 px-1 rounded text-xs">Ctrl+Enter</kbd> to submit • <kbd className="bg-gray-200 px-1 rounded text-xs">Tab</kbd> to indent
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !code.trim()}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSubmitting ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Check className="w-3 h-3" />
                    )}
                    <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                </button>
            </div>
        </div>
    );
};

export default SimpleCodeEditor;
