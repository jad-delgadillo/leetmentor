import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react';

interface ResizablePanelProps {
    children: ReactNode;
    title: string;
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    className?: string;
    isResizable?: boolean;
    canMinimize?: boolean;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
    children,
    title,
    initialWidth = 50,
    minWidth = 20,
    maxWidth = 80,
    className = '',
    isResizable = true,
    canMinimize = true
}) => {
    const [width, setWidth] = useState(initialWidth);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const resizeRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !panelRef.current) return;

            const containerRect = panelRef.current.parentElement?.getBoundingClientRect();
            if (!containerRect) return;

            const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
            setWidth(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, minWidth, maxWidth]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const toggleMinimized = () => {
        setIsMinimized(!isMinimized);
    };

    return (
        <div
            ref={panelRef}
            className={`relative transition-all duration-300 ${className}`}
            style={{
                width: isMinimized ? '50px' : `${width}%`,
                minWidth: isMinimized ? '50px' : `${minWidth}%`
            }}
        >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
                <h3 className={`font-medium text-sm text-gray-700 ${isMinimized ? 'hidden' : ''}`}>
                    {title}
                </h3>

                {canMinimize && (
                    <button
                        onClick={toggleMinimized}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title={isMinimized ? 'Expand panel' : 'Minimize panel'}
                    >
                        {isMinimized ? (
                            <Maximize2 className="w-3 h-3" />
                        ) : (
                            <Minimize2 className="w-3 h-3" />
                        )}
                    </button>
                )}
            </div>

            {/* Panel Content */}
            <div className={`h-full ${isMinimized ? 'hidden' : ''}`}>
                {children}
            </div>

            {/* Minimized State */}
            {isMinimized && (
                <div className="flex items-center justify-center h-full bg-gray-50">
                    <div className="transform -rotate-90 text-xs text-gray-500 font-medium whitespace-nowrap">
                        {title}
                    </div>
                </div>
            )}

            {/* Resize Handle */}
            {isResizable && !isMinimized && (
                <div
                    ref={resizeRef}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-blue-400 transition-colors"
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute inset-y-0 right-0 w-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3 h-3 text-blue-600" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResizablePanel;
