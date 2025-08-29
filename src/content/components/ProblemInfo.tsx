import React from 'react';

interface ProblemInfoProps {
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

const ProblemInfo: React.FC<ProblemInfoProps> = ({ title, difficulty }) => {
    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'easy': return 'difficulty-easy';
            case 'medium': return 'difficulty-medium';
            case 'hard': return 'difficulty-hard';
            default: return 'difficulty-medium';
        }
    };

    return (
        <div className="bg-gradient-to-r from-white/8 to-white/4 p-6 backdrop-blur-lg border-b border-white/10 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl"></div>

            <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2 leading-tight text-gray-800 line-clamp-2">
                            {title}
                        </h2>
                        <div className="text-sm text-gray-600 font-medium">
                            {title === 'No Problem Selected' ? 'Test Mode - Ready for Interview' : 'LeetCode Problem'}
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <div className={`
                            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide
                            shadow-lg border-2 border-white/30 backdrop-blur-sm animate-fade-in-scale
                            ${getDifficultyClass(difficulty)}
                        `}>
                            <div className="w-2 h-2 bg-white rounded-full opacity-90 animate-pulse-slow"></div>
                            {difficulty}
                        </div>
                    </div>
                </div>

                {/* Additional metadata could go here */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                        <span>📊</span>
                        <span className="font-medium">Interview Practice</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>⏱️</span>
                        <span className="font-medium">Ready to start</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProblemInfo;
