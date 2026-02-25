'use client';

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
    symbol?: string;
    theme?: 'dark' | 'light';
    interval?: string;
    height?: number;
}

/**
 * Official TradingView Advanced Real-Time Chart Widget
 * Uses the TradingView embed script for accurate, live CME futures data.
 * Symbol: CME_MINI:MNQ1! (Micro E-mini Nasdaq)
 */
function TradingViewChartComponent({
    symbol = 'CME_MINI:MNQ1!',
    theme = 'dark',
    interval = '1',
    height = 500,
}: TradingViewChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up any previous widget
        containerRef.current.innerHTML = '';

        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container__widget';
        widgetContainer.style.height = `${height - 32}px`;
        widgetContainer.style.width = '100%';
        containerRef.current.appendChild(widgetContainer);

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: false,
            width: '100%',
            height: height - 32,
            symbol,
            interval,
            timezone: 'America/New_York',
            theme,
            style: '1',
            locale: 'en',
            backgroundColor: 'rgba(18, 18, 20, 1)',
            gridColor: 'rgba(255, 255, 255, 0.04)',
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            calendar: false,
            hide_volume: false,
            support_host: 'https://www.tradingview.com',
            studies: [
                'MASimple@tv-basicstudies',
                'VWAP@tv-basicstudies',
            ],
        });

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [symbol, theme, interval, height]);

    return (
        <div
            ref={containerRef}
            className="tradingview-widget-container"
            style={{ height: `${height}px`, width: '100%' }}
        />
    );
}

export const TradingViewChart = memo(TradingViewChartComponent);
