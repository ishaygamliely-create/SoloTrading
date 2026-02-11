'use client';

import React from 'react';
import { ChartAnalysisResult } from '@/app/types/chart-analysis';

interface ChartOverlayProps {
    overlayData: ChartAnalysisResult['overlay'];
    imageSrc: string;
    visibleCategories?: { [key: string]: boolean };
}

export function ChartOverlay({ overlayData, imageSrc }: ChartOverlayProps) {
    // Colors map for semantic rendering
    const colorMap: Record<string, string> = {
        GREEN: '#10b981', // emerald-500
        RED: '#ef4444',   // red-500
        BLUE: '#3b82f6',  // blue-500
        YELLOW: '#eab308' // yellow-500
    };

    return (
        <div className="relative w-full h-full">
            {/* The Image */}
            <img src={imageSrc} alt="Analyzed Chart" className="w-full h-auto block" />

            {/* The Overlay Layer */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                {(overlayData || []).map((item, idx) => {
                    const color = colorMap[item.color || 'BLUE'] || 'white';

                    // Coordinates are 0-1, verify scaling logic.
                    // SVG 100x100 means we just multiply by 100 for %.
                    const x1 = item.coordinates.x1 * 100;
                    const y1 = item.coordinates.y1 * 100;
                    const x2 = (item.coordinates.x2 || x1) * 100;
                    const y2 = (item.coordinates.y2 || y1) * 100;

                    return (
                        <g key={idx}>
                            {item.type === 'BOX' && (
                                <rect
                                    x={Math.min(x1, x2)}
                                    y={Math.min(y1, y2)}
                                    width={Math.abs(x2 - x1)}
                                    height={Math.abs(y2 - y1)}
                                    fill={color}
                                    fillOpacity="0.15"
                                    stroke={color}
                                    strokeWidth="0.5" // Relative to 100 viewBox
                                    strokeDasharray="2,1"
                                />
                            )}

                            {item.type === 'LINE' && (
                                <line
                                    x1={x1} y1={y1}
                                    x2={x2} y2={y2}
                                    stroke={color}
                                    strokeWidth="0.5"
                                />
                            )}

                            {(item.label) && (
                                <g transform={`translate(${x1}, ${y1 - 2})`}>
                                    <rect
                                        x="-2" y="-3" width={(item.label.length * 2) + 4} height="4"
                                        fill={color} rx="1" ry="1"
                                    />
                                    <text
                                        x="0" y="0"
                                        fill="black"
                                        fontSize="2.5"
                                        fontWeight="bold"
                                        textAnchor="start"
                                        dominantBaseline="middle"
                                    >
                                        {item.label}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
