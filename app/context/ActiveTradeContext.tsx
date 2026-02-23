import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TradeScenario, GuidanceMessage, GuidanceStatus } from '../types/tradeScenario';
export type { GuidanceMessage, GuidanceStatus };

export type TradeState = 'SELECTED' | 'OPEN' | 'MANAGING' | 'CLOSED' | 'CONFIRMING';

export interface SavedTrade {
    id: string;
    scenarioId: string;
    symbol: string;
    direction: 'LONG' | 'SHORT';
    setupName: string;
    timeframe: string;
    entryPrice: number;
    stopLossPrice: number;
    targets: number[];
    savedAt: number;
    contractType: 'MNQ' | 'NQ';
}

export interface ActiveTrade extends SavedTrade {
    state: TradeState;
    enteredAt?: number;
    boxHigh?: number; // For break-even/trailing logic (future)
    boxLow?: number;
    maxRiskAmount: number;
    positionSize: number;
    guidance: GuidanceMessage[];
}

interface ActiveTradeContextType {
    savedTrades: SavedTrade[];
    activeTrade: ActiveTrade | null;

    // Actions
    saveTrade: (scenario: TradeScenario) => void;
    removeTrade: (id: string) => void;
    isSaved: (scenarioId: string) => boolean;

    // Active Trade Actions
    selectTrade: (id: string) => void;
    updateTradeParams: (params: Partial<ActiveTrade>) => void;
    markAsEntered: () => void;
    closeTrade: () => void;
    invalidateTrade: () => void; // Explicit "Lost/Invalidated" exit
    addGuidance: (msg: GuidanceMessage) => void;
    activateScenario: (scenario: TradeScenario) => void;
}

const ActiveTradeContext = createContext<ActiveTradeContextType | undefined>(undefined);

export function ActiveTradeProvider({ children }: { children: ReactNode }) {
    const [savedTrades, setSavedTrades] = useState<SavedTrade[]>([]);
    const [activeTrade, setActiveTrade] = useState<ActiveTrade | null>(null);

    // --- PERSISTENCE ---
    useEffect(() => {
        // Load Saved Trades
        const saved = localStorage.getItem('vwap_saved_trades');
        if (saved) {
            try {
                setSavedTrades(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load saved trades", e);
            }
        }

        // Load Active Trade
        const active = localStorage.getItem('vwap_active_trade');
        if (active) {
            try {
                const parsed = JSON.parse(active);
                // Basic expiration check? (For now, just load it)
                setActiveTrade(parsed);
            } catch (e) {
                console.error("Failed to load active trade", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('vwap_saved_trades', JSON.stringify(savedTrades));
    }, [savedTrades]);

    useEffect(() => {
        if (activeTrade) {
            localStorage.setItem('vwap_active_trade', JSON.stringify(activeTrade));
        } else {
            localStorage.removeItem('vwap_active_trade');
        }
    }, [activeTrade]);

    // --- ACTIONS ---

    const saveTrade = (scenario: TradeScenario) => {
        if (!scenario.id) return;

        // Ensure symbol is present, fallback to MNQ if missing (for legacy or generic triggers)
        const symbol = scenario.symbol || 'MNQ';

        // Prevent duplicates
        if (savedTrades.some(t => t.scenarioId === scenario.id)) return;

        const initialEntry = (scenario.entryZone.min + scenario.entryZone.max) / 2;
        // Default Risk Params
        const defaultRiskAmount = 500;

        // Shield against NEUTRAL direction - should not be activatable as trade
        if (scenario.direction === 'NEUTRAL') return;

        const newTrade: SavedTrade = {
            id: Date.now().toString(),
            scenarioId: scenario.id,
            symbol: symbol,
            direction: scenario.direction as 'LONG' | 'SHORT',
            setupName: scenario.type?.replace(/_/g, ' ') || 'Manual Setup',
            timeframe: scenario.timeframe || '1m',
            entryPrice: initialEntry,
            stopLossPrice: scenario.stopLoss || scenario.invalidation || 0,
            targets: scenario.targets.map(t => t.price),
            savedAt: Date.now(),
            contractType: symbol.includes('NQ') && !symbol.includes('MNQ') ? 'NQ' : 'MNQ'
        };

        setSavedTrades(prev => [newTrade, ...prev]);
    };

    const removeTrade = (id: string) => {
        setSavedTrades(prev => prev.filter(t => t.id !== id));
        if (activeTrade?.id === id) {
            setActiveTrade(null);
        }
    };

    const isSaved = (scenarioId: string) => {
        return savedTrades.some(t => t.scenarioId === scenarioId);
    };

    // --- ACTIVE TRADE ACTIONS ---

    const selectTrade = (id: string) => {
        const trade = savedTrades.find(t => t.id === id);
        if (!trade) return;

        // Default constraints for new selection
        const pointValue = trade.contractType === 'NQ' ? 20 : 2;
        const riskPerContract = Math.abs(trade.entryPrice - trade.stopLossPrice) * pointValue;
        const defaultMaxRisk = 500;
        const defaultSize = riskPerContract > 0 ? Math.floor(defaultMaxRisk / riskPerContract) || 1 : 1;

        const newActive: ActiveTrade = {
            ...trade,
            state: 'SELECTED',
            maxRiskAmount: defaultMaxRisk,
            positionSize: defaultSize,
            guidance: []
        };
        setActiveTrade(newActive);
    };

    const updateTradeParams = (params: Partial<ActiveTrade>) => {
        if (!activeTrade) return;
        setActiveTrade(prev => prev ? { ...prev, ...params } : null);
    };

    const markAsEntered = () => {
        if (!activeTrade) return;

        // 1. Set to CONFIRMING for immediate UI feedback
        setActiveTrade(prev => prev ? { ...prev, state: 'CONFIRMING' } : null);

        // 2. Auto-transition to MANAGING after a short delay (simulating order confirmation)
        setTimeout(() => {
            setActiveTrade(prev => {
                if (!prev || prev.id !== activeTrade.id) return prev;
                return {
                    ...prev,
                    state: 'MANAGING',
                    enteredAt: Date.now()
                };
            });
        }, 2000);
    };

    const closeTrade = () => {
        // In reality, might want to move to a 'History' list first
        setActiveTrade(null);
    };

    const invalidateTrade = () => {
        // Logic for when a trade hits SL or is invalidated manually
        closeTrade();
    };

    const addGuidance = (msg: GuidanceMessage) => {
        if (!activeTrade) return;
        setActiveTrade(prev => {
            if (!prev) return null;
            return {
                ...prev,
                guidance: [msg, ...prev.guidance]
            };
        });
    };

    const activateScenario = (scenario: TradeScenario) => {
        // 1. Save it if not already saved
        if (!isSaved(scenario.id || '')) {
            saveTrade(scenario);
        }

        // 2. We need to find the newly created SavedTrade object or simulate it
        // Since setSavedTrades is async, we simulate the selection from scenario data
        const symbol = scenario.symbol || 'MNQ';
        const initialEntry = (scenario.entryZone.min + scenario.entryZone.max) / 2;
        const contractType = symbol.includes('NQ') && !symbol.includes('MNQ') ? 'NQ' : 'MNQ';
        const pointValue = contractType === 'NQ' ? 20 : 2;
        const stopLossPrice = scenario.stopLoss || scenario.invalidation || 0;
        const riskPerContract = Math.abs(initialEntry - stopLossPrice) * pointValue;
        const defaultMaxRisk = 500;
        const defaultSize = riskPerContract > 0 ? Math.floor(defaultMaxRisk / riskPerContract) || 1 : 1;

        const newActive: ActiveTrade = {
            id: Date.now().toString(), // Temp ID or we could try to match saved one
            scenarioId: scenario.id || '',
            symbol: symbol,
            direction: scenario.direction as 'LONG' | 'SHORT',
            setupName: scenario.type?.replace(/_/g, ' ') || 'Manual Setup',
            timeframe: scenario.timeframe || '1m',
            entryPrice: initialEntry,
            stopLossPrice: stopLossPrice,
            targets: scenario.targets.map(t => t.price),
            savedAt: Date.now(),
            contractType: contractType,
            state: 'SELECTED',
            maxRiskAmount: defaultMaxRisk,
            positionSize: defaultSize,
            guidance: []
        };

        setActiveTrade(newActive);
    };

    return (
        <ActiveTradeContext.Provider value={{
            savedTrades,
            activeTrade,
            saveTrade,
            removeTrade,
            isSaved,
            selectTrade,
            updateTradeParams,
            markAsEntered,
            closeTrade,
            invalidateTrade,
            addGuidance,
            activateScenario
        }}>
            {children}
        </ActiveTradeContext.Provider>
    );
}

export function useActiveTrade() {
    const context = useContext(ActiveTradeContext);
    if (context === undefined) {
        throw new Error('useActiveTrade must be used within an ActiveTradeProvider');
    }
    return context;
}
