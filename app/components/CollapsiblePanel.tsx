'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsiblePanelProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
    icon?: React.ReactNode;
    headerRight?: React.ReactNode;
}

export function CollapsiblePanel({
    title,
    children,
    defaultOpen = true,
    className = '',
    icon,
    headerRight
}: CollapsiblePanelProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50 ${className}`}>
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
                    <button className="text-zinc-500 hover:text-white transition-colors">
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    {icon && <span className="text-zinc-400">{icon}</span>}
                    <span>{title}</span>
                </div>
                {headerRight && <div className="text-xs">{headerRight}</div>}
            </div>

            {/* Content */}
            {isOpen && (
                <div className="p-4 border-t border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}
