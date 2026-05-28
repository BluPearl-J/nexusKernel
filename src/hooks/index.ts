/**
 * WardrobeAI — Custom Hooks
 * Screens never call services directly.
 * Hooks are the bridge between services and UI.
 */

import { useState, useEffect, useCallback } from 'react';
import { WardrobeService } from '../services/wardrobe.service';
import { kernel } from '../core/kernel';
import type { AIService } from '../plugins/ai/AIPlugin';
import type { AuthService } from '../plugins/auth/AuthPlugin';
import type { ClothingItem, Outfit, OutfitSuggestionRequest, User } from '../models';

// ── Auth Hook ─────────────────────────────────────────────────────
export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const authService = kernel.resolve<AuthService>('AuthService');

    useEffect(() => {
        authService.getSession().then((u) => {
            setUser(u);
            setLoading(false);
        });

        const unsub = authService.onAuthStateChange((u) => setUser(u));
        return unsub;
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        return authService.signIn(email, password);
    }, []);

    const signUp = useCallback(async (email: string, password: string, name: string) => {
        return authService.signUp(email, password, name);
    }, []);

    const signOut = useCallback(async () => {
        return authService.signOut();
    }, []);

    return { user, loading, signIn, signUp, signOut };
}

// ── Wardrobe Hook ─────────────────────────────────────────────────
export function useWardrobe(userId: string) {
    const [items, setItems] = useState<ClothingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        const result = await WardrobeService.getItems(userId);
        if (result.success) {
            setItems(result.data);
        } else {
            setError(result.error);
        }
        setLoading(false);
    }, [userId]);

    // OPTIMIZED: Breaks the synchronous render cascade using a microtask timer
    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchItems();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchItems]);

    const addItem = useCallback(async (
        item: Omit<ClothingItem, 'id' | 'created_at' | 'times_worn' | 'last_worn'>
    ) => {
        const result = await WardrobeService.addItem(item);
        if (result.success) {
            setItems((prev) => [result.data, ...prev]);
        }
        return result;
    }, []);

    const deleteItem = useCallback(async (id: string) => {
        const result = await WardrobeService.deleteItem(id);
        if (result.success) {
            setItems((prev) => prev.filter((i) => i.id !== id));
        }
        return result;
    }, []);

    return { items, loading, error, addItem, deleteItem, refresh: fetchItems };
}

// ── AI Outfit Suggestion Hook ─────────────────────────────────────
export function useOutfitSuggestion() {
    const [suggestion, setSuggestion] = useState<Outfit | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const aiService = kernel.resolve<AIService>('AIService');

    const suggest = useCallback(async (request: OutfitSuggestionRequest) => {
        setLoading(true);
        setError(null);

        const result = await aiService.suggestOutfit(request);

        if (result.success) {
            setSuggestion({
                id: Date.now().toString(),
                user_id: request.user_id,
                name: `${request.occasion} outfit`,
                items: result.data.outfit,
                occasion: request.occasion,
                season: 'auto',
                ai_generated: true,
                rating: null,
                created_at: new Date().toISOString(),
            });
        } else {
            setError(result.error);
        }

        setLoading(false);
    }, []);

    return { suggestion, loading, error, suggest };
}