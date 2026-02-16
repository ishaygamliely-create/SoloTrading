"use client";

import React from "react";

type Props = {
    title: string;
    defaultOpen?: boolean;
    right?: React.ReactNode;
    children: React.ReactNode;
};

export default function CollapsibleSection({
    title,
    defaultOpen = false,
    right,
    children,
}: Props) {
    const [open, setOpen] = React.useState(defaultOpen);

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white/80">{title}</span>
                    <span className="text-xs text-white/40">{open ? "▲" : "▼"}</span>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {right}
                </div>
            </button>

            {open && <div className="px-3 pb-3 border-t border-white/5">{children}</div>}
        </div>
    );
}
