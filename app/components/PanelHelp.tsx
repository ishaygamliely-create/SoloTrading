import React, { useState } from "react";
import { HelpCircle, X } from "lucide-react";

type Props = {
    title: string;
    bullets?: string[];
    children?: React.ReactNode;
};

export function PanelHelp({ title, bullets, children }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
                <HelpCircle size={12} />
                <span>What {title} checks</span>
            </button>

            {open && (
                <div className="mt-2 p-3 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-400 space-y-1 relative animate-in fade-in slide-in-from-top-1 z-50">
                    <button
                        onClick={() => setOpen(false)}
                        className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300"
                    >
                        <X size={12} />
                    </button>
                    <div className="font-semibold text-zinc-300 mb-1">{title} Help</div>

                    {bullets && (
                        <ul className="list-disc list-inside space-y-0.5 mb-2">
                            {bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                            ))}
                        </ul>
                    )}

                    {children}
                </div>
            )}
        </div>
    );
}
