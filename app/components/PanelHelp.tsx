"use client";

import React from "react";

export function PanelHelp({
    title,
    children,
    defaultOpen = false,
}: {
    title: string; // usually panel name
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = React.useState(defaultOpen);

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full text-left text-xs text-white/60 hover:text-white/80 transition flex items-center gap-2"
                aria-expanded={open}
            >
                <span className="select-none">
                    {open ? "▾" : "▸"}
                </span>
                <span className="font-medium">What {title} checks</span>
                <span className="text-white/40">(click)</span>
            </button>

            {open && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/70">
                    {children}
                </div>
            )}
        </div>
    );
}
