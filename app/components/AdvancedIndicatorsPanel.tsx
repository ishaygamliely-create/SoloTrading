import React from 'react';
import { Layers, Rocket, ChevronRight } from 'lucide-react';

interface Props {
    onClick: () => void;
    isOpen: boolean;
}

export function AdvancedIndicatorsPanel({ onClick, isOpen }: Props) {
    return (
        <button
            onClick={onClick}
            className={`w-full group relative overflow-hidden rounded-xl border transition-all duration-300 p-4 flex items-center justify-between
                ${isOpen
                    ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                    : 'bg-zinc-900/50 border-white/10 hover:border-blue-500/50 hover:bg-zinc-800/80'}`}
        >
            {/* Background HUD Decorative Elements */}
            <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent ${isOpen ? 'via-white/50' : 'via-blue-500/20'} to-transparent`} />
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10">
                <div className={`p-2 rounded-lg border transition-colors ${isOpen ? 'bg-white/20 border-white/30' : 'bg-blue-500/10 border-blue-500/20 group-hover:bg-blue-500/20'}`}>
                    <Rocket size={16} className={isOpen ? 'text-white' : 'text-blue-400'} />
                </div>
                <div className="flex flex-col text-left">
                    <span className={`text-xs font-black uppercase tracking-[0.1em] leading-none ${isOpen ? 'text-white' : 'text-zinc-300 group-hover:text-white transition-colors'}`}>
                        Advanced Suite
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 relative z-10">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase transition-all
                    ${isOpen
                        ? 'bg-white text-blue-600 border-white'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:scale-105'}`}>
                    {isOpen ? 'ACTIVE' : 'LAUNCH'}
                    <ChevronRight size={10} strokeWidth={3} className={isOpen ? 'rotate-90 transition-transform' : ''} />
                </div>
            </div>
        </button>
    );
}
