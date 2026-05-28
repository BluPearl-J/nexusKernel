/**
 * WardrobeAI — Supabase Client
 * Single source of truth for the Supabase connection.
 * Row-Level Security is enforced at the database level.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        'Missing Supabase environment variables. Check your .env file.'
    );
}

export const supabase = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
        realtime: {
            params: { eventsPerSecond: 10 },
        },
    }
);

// ── Query Helpers (type-safe) ─────────────────────────────────────
export const tables = {
    users: () => supabase.from('users'),
    wardrobe: () => supabase.from('wardrobe_items'),
    outfits: () => supabase.from('outfits'),
    outfit_items: () => supabase.from('outfit_items'),
} as const;
