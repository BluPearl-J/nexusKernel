/**
 * WardrobeAI — Domain Models
 * All types are strict, no `any`. Every model maps to a Supabase table.
 */

// ── User ─────────────────────────────────────────────────────────
export interface User {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    style_profile: StyleProfile | null;
    created_at: string;
}

export interface StyleProfile {
    preferred_styles: StyleTag[];
    body_type: string;
    climate: string;
    color_preferences: string[];
}

export type StyleTag =
    | 'casual'
    | 'formal'
    | 'streetwear'
    | 'minimalist'
    | 'maximalist'
    | 'sporty'
    | 'business';

// ── Wardrobe ─────────────────────────────────────────────────────
export interface ClothingItem {
    id: string;
    user_id: string;
    name: string;
    category: ClothingCategory;
    color: string;
    image_url: string;
    tags: string[];
    times_worn: number;
    last_worn: string | null;
    created_at: string;
}

export type ClothingCategory =
    | 'tops'
    | 'bottoms'
    | 'dresses'
    | 'outerwear'
    | 'shoes'
    | 'accessories';

export interface Outfit {
    id: string;
    user_id: string;
    name: string;
    items: ClothingItem[];
    occasion: string;
    season: string;
    ai_generated: boolean;
    rating: number | null;
    created_at: string;
}

// ── AI ────────────────────────────────────────────────────────────
export interface OutfitSuggestionRequest {
    user_id: string;
    occasion: string;
    weather: WeatherContext;
    available_items: ClothingItem[];
}

export interface WeatherContext {
    temperature: number;
    condition: 'sunny' | 'cloudy' | 'rainy' | 'cold' | 'hot';
    location: string;
}

export interface OutfitSuggestionResponse {
    outfit: ClothingItem[];
    reasoning: string;
    confidence: number;
    alternatives: ClothingItem[][];
}

// ── API Responses ─────────────────────────────────────────────────
export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    status: 'success' | 'error';
}

export type Result<T> = { success: true; data: T } | { success: false; error: string };
