'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, Time, CandlestickSeries } from 'lightweight-charts';

interface ChartProps {
    data: {
        time: Time;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

export const Chart: React.FC<ChartProps> = ({ data, colors = {} }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const {
            backgroundColor = 'black',
            textColor = 'white',
        } = colors;

        // Initialize with container dimensions
        const container = chartContainerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        chartRef.current = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width,
            height,
            grid: {
                vertLines: { color: '#333' },
                horzLines: { color: '#333' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            }
        });

        const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        candlestickSeries.setData(
            data.map((d) => ({
                time: d.time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }))
        );

        // Resize Observer for dynamic sizing (Width & Height)
        const resizeObserver = new ResizeObserver((entries) => {
            if (!chartRef.current) return;

            for (const entry of entries) {
                if (entry.contentRect) {
                    chartRef.current.applyOptions({
                        width: entry.contentRect.width,
                        height: entry.contentRect.height
                    });
                }
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, [data, colors]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
};
