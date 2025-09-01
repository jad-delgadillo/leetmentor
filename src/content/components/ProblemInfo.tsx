import React from 'react';
import { BarChart2, Clock } from 'lucide-react';

interface ProblemInfoProps {
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

const ProblemInfo: React.FC<ProblemInfoProps> = ({ title, difficulty }) => {
    const getDifficultyDotClass = (d: string) => {
        switch (d.toLowerCase()) {
            case 'easy': return 'bg-green-500';
            case 'medium': return 'bg-amber-500';
            case 'hard': return 'bg-red-500';
            default: return 'bg-amber-500';
        }
    };

    return (
        <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                        <p className="text-xl font-semibold mb-1 leading-tight text-gray-900 line-clamp-2">
                            {title}
                        </p>
                        <div className="text-sm text-gray-500">
                            {title === 'No Problem Selected' ? 'Test Mode - Ready for Interview' : 'LeetCode Problem'}
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700">
                            <span className={`w-2 h-2 rounded-full ${getDifficultyDotClass(difficulty)}`}></span>
                            {difficulty}
                        </span>
                    </div>
                </div>

                {/* Additional metadata could go here */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4" />
                        <span className="font-medium">Interview Practice</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Ready to start</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProblemInfo;
