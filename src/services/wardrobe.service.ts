/**
 * WardrobeAI — Wardrobe Service
 * Business logic for wardrobe management.
 * Talks to Supabase. Never imported directly by screens —
 * screens use hooks, hooks use services.
 */

import { supabase, tables } from '../services/supabase';
import type { ClothingItem, Outfit, Result } from '../models';

export const WardrobeService = {
    // ── Items ──────────────────────────────────────────────────────
    async getItems(userId: string): Promise<Result<ClothingItem[]>> {
        const { data, error } = await (tables.wardrobe() as any)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return { success: false, error: error.message };
        return { success: true, data: data as ClothingItem[] };
    },

    async addItem(
        item: Omit<ClothingItem, 'id' | 'created_at' | 'times_worn' | 'last_worn'>
    ): Promise<Result<ClothingItem>> {
        const { data, error } = await (tables.wardrobe() as any).insert(item).select().single();
        if (error) return { success: false, error: error.message };
        return { success: true, data: data as ClothingItem };
    },

    async updateItem(
        id: string,
        updates: Partial<ClothingItem>
    ): Promise<Result<ClothingItem>> {
        const { data, error } = await (tables.wardrobe() as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return { success: false, error: error.message };
        return { success: true, data: data as ClothingItem };
    },

    async deleteItem(id: string): Promise<Result<void>> {
        const { error } = await (tables.wardrobe() as any).delete().eq('id', id);
        if (error) return { success: false, error: error.message };
        return { success: true, data: undefined };
    },

    async incrementTimesWorn(id: string): Promise<Result<void>> {
        const { error } = await supabase.rpc('increment_times_worn' as any, { item_id: id } as any);
        if (error) return { success: false, error: error.message };
        return { success: true, data: undefined };
    },

    // ── Upload Image ──────────────────────────────────────────────
    async uploadItemImage(
        userId: string,
        uri: string,
        fileName: string
    ): Promise<Result<string>> {
        const response = await fetch(uri);
        const blob = await response.blob();
        const path = `${userId}/${fileName}`;

        const { error } = await supabase.storage
            .from('wardrobe-images')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

        if (error) return { success: false, error: error.message };

        const { data } = supabase.storage.from('wardrobe-images').getPublicUrl(path);
        return { success: true, data: data.publicUrl };
    },

    // ── Outfits ───────────────────────────────────────────────────
    async getOutfits(userId: string): Promise<Result<Outfit[]>> {
        const { data, error } = await (tables.outfits() as any)
            .select(`*, outfit_items(*, wardrobe_items(*))`)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) return { success: false, error: error.message };
        return { success: true, data: data as unknown as Outfit[] };
    },

    async saveOutfit(
        outfit: Omit<Outfit, 'id' | 'created_at'> & { items: ClothingItem[] }
    ): Promise<Result<Outfit>> {
        const { items, ...outfitData } = outfit;

        const { data: savedOutfit, error } = await (tables.outfits() as any)
            .insert(outfitData)
            .select()
            .single();

        if (error) return { success: false, error: error.message };

        // Link items to outfit
        const outfitItems = items.map((item) => ({
            outfit_id: (savedOutfit as any).id,
            wardrobe_item_id: item.id,
        }));

        await (tables.outfit_items() as any).insert(outfitItems);
        return { success: true, data: savedOutfit as unknown as Outfit };
    },
};