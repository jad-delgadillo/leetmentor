import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { GripHorizontal, Maximize2, Minimize2, Square } from 'lucide-react';

interface SplitPanelProps {
    topPanel: ReactNode;
    bottomPanel: ReactNode;
    topTitle: string;
    bottomTitle: string;
    initialTopHeight?: number;
    minTopHeight?: number;
    maxTopHeight?: number;
    showBottomPanel?: boolean;
    className?: string;
}

const SplitPanel: React.FC<SplitPanelProps> = ({
    topPanel,
    bottomPanel,
    topTitle,
    bottomTitle,
    initialTopHeight = 60,
    minTopHeight = 30,
    maxTopHeight = 85,
    showBottomPanel = true,
    className = ''
}) => {
    const [topHeight, setTopHeight] = useState(initialTopHeight);
    const [isDragging, setIsDragging] = useState(false);
    const [isBottomMinimized, setIsBottomMinimized] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
            const clampedHeight = Math.min(Math.max(newHeight, minTopHeight), maxTopHeight);
            setTopHeight(clampedHeight);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, minTopHeight, maxTopHeight]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const toggleBottomMinimized = () => {
        setIsBottomMinimized(!isBottomMinimized);
    };

    const maximizeTop = () => {
        setTopHeight(95);
    };

    const maximizeBottom = () => {
        setTopHeight(10);
    };

    const resetSplit = () => {
        setTopHeight(initialTopHeight);
        setIsBottomMinimized(false);
    };

    if (!showBottomPanel) {
        return (
            <div className={`h-full flex flex-col ${className}`}>
                <div className="flex-1 h-full">
                    {topPanel}
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`h-full flex flex-col ${className}`}>
            {/* Top Panel */}
            <div
                className="border-b border-gray-200 overflow-hidden"
                style={{ height: isBottomMinimized ? '100%' : `${topHeight}%` }}
            >
                {/* Top Panel Header */}
                <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
                    <h3 className="font-medium text-sm text-gray-700">{topTitle}</h3>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={maximizeTop}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Maximize chat"
                        >
                            <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                            onClick={resetSplit}
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Reset split"
                        >
                            <Square className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="h-full">
                    {topPanel}
                </div>
            </div>

            {/* Resize Handle */}
            {!isBottomMinimized && (
                <div
                    className="h-1 bg-gray-200 cursor-row-resize group hover:bg-blue-400 transition-colors relative"
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute inset-x-0 top-0 h-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripHorizontal className="w-4 h-3 text-blue-600" />
                    </div>
                </div>
            )}

            {/* Bottom Panel */}
            {!isBottomMinimized && (
                <div
                    className="overflow-hidden"
                    style={{ height: `${100 - topHeight}%` }}
                >
                    {/* Bottom Panel Header */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
                        <h3 className="font-medium text-sm text-gray-700">{bottomTitle}</h3>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={maximizeBottom}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                title="Maximize code editor"
                            >
                                <Maximize2 className="w-3 h-3" />
                            </button>
                            <button
                                onClick={toggleBottomMinimized}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                title="Minimize code editor"
                            >
                                <Minimize2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <div className="h-full">
                        {bottomPanel}
                    </div>
                </div>
            )}

            {/* Minimized Bottom Panel */}
            {isBottomMinimized && (
                <div className="h-8 bg-gray-50 border-t border-gray-200 flex items-center justify-between px-3">
                    <span className="text-xs text-gray-600 font-medium">{bottomTitle} (minimized)</span>
                    <button
                        onClick={toggleBottomMinimized}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title="Restore code editor"
                    >
                        <Maximize2 className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SplitPanel;
