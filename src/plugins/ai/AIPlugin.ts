/**
 * WardrobeAI — AI Plugin
 * Integrates Google Gemini for outfit suggestions.
 * Handles token costs, retries, and response parsing.
 */

import type { Kernel, Plugin } from '../../core/kernel';
import type {
    OutfitSuggestionRequest,
    OutfitSuggestionResponse,
    ClothingItem,
    Result,
} from '../../models';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface AIService {
    suggestOutfit(request: OutfitSuggestionRequest): Promise<Result<OutfitSuggestionResponse>>;
    describeItem(imageUrl: string): Promise<Result<Partial<ClothingItem>>>;
}

class AIPluginImpl implements Plugin {
    name = 'ai';
    version = '1.0.0';
    private apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;

    async initialize(kernel: Kernel): Promise<void> {
        kernel.provide<AIService>('AIService', this.createService());
    }

    async destroy(): Promise<void> {}

    private createService(): AIService {
        return {
            suggestOutfit: async (request) => {
                const prompt = this.buildOutfitPrompt(request);

                try {
                    const response = await this.callGemini(prompt);
                    const parsed = this.parseOutfitResponse(response, request.available_items);
                    return { success: true, data: parsed };
                } catch (err) {
                    return { success: false, error: (err as Error).message };
                }
            },

            describeItem: async (imageUrl) => {
                const prompt = `Analyze this clothing item image and return JSON with: 
          { name, category, color, tags[] }
          Categories: tops|bottoms|dresses|outerwear|shoes|accessories`;

                try {
                    const response = await this.callGeminiWithImage(prompt, imageUrl);
                    const data = JSON.parse(response);
                    return { success: true, data };
                } catch (err) {
                    return { success: false, error: (err as Error).message };
                }
            },
        };
    }

    private buildOutfitPrompt(req: OutfitSuggestionRequest): string {
        const items = req.available_items
            .map((i) => `${i.category}: ${i.name} (${i.color})`)
            .join('\n');

        return `You are a personal stylist. Suggest an outfit for:
Occasion: ${req.occasion}
Weather: ${req.weather.temperature}°C, ${req.weather.condition}
Available items:
${items}

Return JSON: { 
  "selected_item_ids": string[], 
  "reasoning": string, 
  "confidence": number (0-1),
  "alternative_ids": string[][]
}`;
    }

    private async callGemini(prompt: string): Promise<string> {
        const res = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                },
            }),
        });

        if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    }

    private async callGeminiWithImage(prompt: string, imageUrl: string): Promise<string> {
        // Fetch image and convert to base64
        const imageRes = await fetch(imageUrl);
        const blob = await imageRes.blob();
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
        });

        const res = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                    ],
                }],
            }),
        });

        if (!res.ok) throw new Error(`Gemini Vision error: ${res.status}`);
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    }

    private parseOutfitResponse(
        raw: string,
        allItems: ClothingItem[]
    ): OutfitSuggestionResponse {
        const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
        const itemMap = new Map(allItems.map((i) => [i.id, i]));

        return {
            outfit: (json.selected_item_ids as string[])
                .map((id) => itemMap.get(id))
                .filter(Boolean) as ClothingItem[],
            reasoning: json.reasoning,
            confidence: json.confidence,
            alternatives: (json.alternative_ids as string[][]).map((ids) =>
                ids.map((id) => itemMap.get(id)).filter(Boolean) as ClothingItem[]
            ),
        };
    }
}

export const AIPlugin = new AIPluginImpl();
