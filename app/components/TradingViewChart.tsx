'use client';

import React, { memo } from 'react';

interface TradingViewChartProps {
    symbol?: string;
    theme?: 'dark' | 'light';
    interval?: string;
    height?: number;
}

/**
 * Official TradingView Advanced Real-Time Chart Widget
 * Uses the iframe embed method for guaranteed correct symbol loading.
 * Symbol: CME_MINI:MNQ1! (Micro E-mini Nasdaq - Continuous Front Month)
 */
function TradingViewChartComponent({
    symbol = 'CME_MINI:MNQ1!',
    theme = 'dark',
    interval = '1',
    height = 500,
}: TradingViewChartProps) {
    const encodedSymbol = encodeURIComponent(symbol);

    const src =
        `https://www.tradingview.com/widgetembed/` +
        `?frameElementId=tradingview_mnq_chart` +
        `&symbol=${encodedSymbol}` +
        `&interval=${interval}` +
        `&timezone=America%2FNew_York` +
        `&theme=${theme}` +
        `&style=1` +
        `&locale=en` +
        `&hide_top_toolbar=0` +
        `&hide_legend=0` +
        `&save_image=0` +
        `&hide_volume=0` +
        `&studies=MASimple%40tv-basicstudies%1FVWAP%40tv-basicstudies`;

    return (
        <div className="w-full" style={{ height: `${height}px` }}>
            <iframe
                id="tradingview_mnq_chart"
                title="TradingView MNQ Chart"
                src={src}
                width="100%"
                height={height}
                frameBorder={0}
                scrolling="no"
                allowFullScreen
                style={{ display: 'block', width: '100%', height: `${height}px` }}
            />
        </div>
    );
}

export const TradingViewChart = memo(TradingViewChartComponent);
