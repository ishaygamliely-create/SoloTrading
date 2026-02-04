'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileImage, Clipboard, X } from 'lucide-react';

interface ChartUploadProps {
    onImageSelected: (file: File) => void;
    onMockToggle: (enabled: boolean) => void;
    isMockMode: boolean;
}

export function ChartUpload({ onImageSelected, onMockToggle, isMockMode }: ChartUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = useCallback((file: File) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
            onImageSelected(file);
        }
    }, [onImageSelected]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        if (e.clipboardData.files?.[0]) {
            handleFile(e.clipboardData.files[0]);
        }
    }, [handleFile]);

    const handleClear = () => {
        setPreview(null);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            {/* Input Zone */}
            {!preview ? (
                <div
                    className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors
                        ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onPaste={handlePaste}
                    tabIndex={0} // Focusable for paste
                >
                    <Upload className="w-12 h-12 text-zinc-500 mb-4" />
                    <h3 className="text-lg font-bold text-zinc-300">Upload Chart Snapshot</h3>
                    <p className="text-sm text-zinc-500 mt-2 text-center max-w-xs">
                        Drag & drop a file, or <span className="text-blue-500 font-bold cursor-pointer">paste (Ctrl+V)</span> directly.
                    </p>
                    <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                </div>
            ) : (
                <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
                    <img src={preview} alt="Upload Preview" className="w-full h-auto max-h-[500px] object-contain" />
                    <button
                        onClick={handleClear}
                        className="absolute top-2 right-2 bg-zinc-900/80 p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    {isMockMode && (
                        <div className="absolute top-2 left-2 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded border border-yellow-500/30 font-bold backdrop-blur-sm">
                            MOCK MODE
                        </div>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isMockMode}
                            onChange={(e) => onMockToggle(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                        />
                        <span>Use Mock Response (Offline Test)</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
