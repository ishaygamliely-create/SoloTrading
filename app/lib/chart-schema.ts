
import { z } from 'zod';

export const ChartAnalysisSchema = z.object({
    bias: z.enum(['LONG_LEANING', 'SHORT_LEANING', 'NEUTRAL']),
    confidence_score: z.number().min(0).max(100),
    reasons: z.array(z.string()).min(3).max(7),
    indicators: z.array(z.object({
        category: z.enum(['MARKET_STRUCTURE', 'LIQUIDITY', 'IMBALANCE', 'ORDER_BLOCKS', 'MOMENTUM', 'VOLUME', 'TIME_CONTEXT', 'SMT', 'VWAP']),
        status: z.enum(['DETECTED', 'NOT_DETECTED', 'NOT_AVAILABLE']),
        confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
        evidence_note: z.string()
    })),
    limitations: z.array(z.string()),
    overlay: z.array(z.object({
        type: z.enum(['BOX', 'LINE', 'LABEL', 'ARROW']),
        label: z.string().optional(),
        color: z.enum(['GREEN', 'RED', 'BLUE', 'YELLOW']).optional(),
        coordinates: z.object({
            x1: z.number().min(0).max(1),
            y1: z.number().min(0).max(1),
            x2: z.number().min(0).max(1).optional(),
            y2: z.number().min(0).max(1).optional()
        })
    }))
});

export type ChartAnalysisSchemaType = z.infer<typeof ChartAnalysisSchema>;
