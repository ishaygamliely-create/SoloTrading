'use client';

import { ActiveTradeProvider } from './context/ActiveTradeContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ActiveTradeProvider>
            {children}
        </ActiveTradeProvider>
    );
}
