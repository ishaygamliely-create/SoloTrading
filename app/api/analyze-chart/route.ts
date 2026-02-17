import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { ChartAnalysisResult } from '@/app/types/chart-analysis';
import { ChartAnalysisSchema } from '@/app/lib/chart-schema';

// Maximum duration for Vision analysis
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { image, additionalContext } = await req.json();

        // Ensure context defaults to MNQ
        const context = {
            ...additionalContext,
            symbol: additionalContext?.symbol || "MNQ"
        };

        if (!image) {
            return new Response('Image data is required', { status: 400 });
        }

        // Context Construction
        let userPrompt = 'Analyze this chart based on institutional smart money concepts.';
        if (context?.symbol || context?.timeframe) {
            userPrompt += `\n\nCONTEXT:\n`;
            if (context.symbol) userPrompt += `- Symbol: ${context.symbol}\n`;
            if (context.timeframe) userPrompt += `- Timeframe: ${context.timeframe}\n`;
            userPrompt += `Use this context to confirm indicators or market session, but prioritize visual evidence.`;
        }

        const result = await generateObject({
            model: google('gemini-1.5-pro-latest'),
            schema: ChartAnalysisSchema,
            messages: [
                {
                    role: 'system',
                    content: `You are a Price Action Algorithms Expert specializing in institutional market structure. 
          
          CORE DIRECTIVE: Analyze the provided chart image strictly based on VISUAL EVIDENCE. Do NOT hallucinate data not present in the image.
          
          RULES:
          1. **Image-Only**: If timestamps, tickers, or indicators (VWAP/EMAs) are not visible, mark them as 'NOT_AVAILABLE'. Do not guess.
          2. **Confidence**: If the chart is blurry, ambiguous, or lacks context (e.g. no price scale), set 'confidence_score' low (<30) and bias 'NEUTRAL'.
          3. **Neutral Default**: If market structure is conflicting or unclear, default to 'NEUTRAL'.
          4. **SMT**: Mark as 'NOT_AVAILABLE' unless multiple distinct instrument charts are visible in the same image.
          5. **Overlay**: Return normalized coordinates (0-1) for bounding boxes/lines. x=0 is left, y=0 is top.
          
          INDICATOR GUIDELINES:
          - Structure: Identify clear BOS/CHoCH.
          - Liquidity: Look for Equal Highs/Lows (EQH/EQL) or Sweep candles.
          - Imbalance: Visible FVG (gaps between wicks).
          
          OUTPUT: Return a structured JSON object exactly matching the schema.`
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        { type: 'image', image: image } // Expecting base64 data URI
                    ]
                }
            ]
        });

        const response: ChartAnalysisResult = {
            meta: {
                version: 'v1',
                timestamp: new Date().toISOString()
            },
            ...result.object
        };

        return Response.json(response);

    } catch (error: any) {
        console.error('Analysis failed:', error);
        return new Response(JSON.stringify({ error: 'Failed to analyze chart', details: error.message }), { status: 500 });
    }
}
