export type Database = {
    public: {
        Tables: {
            wardrobe_items: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    category: string;
                    image_url: string | null;
                    times_worn: number;
                    last_worn: string | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['wardrobe_items']['Row'], 'id' | 'created_at'> & {
                    times_worn?: number;
                };
                Update: Partial<Database['public']['Tables']['wardrobe_items']['Row']>;
            };
            outfits: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    occasion: string;
                    season: string;
                    ai_generated: boolean;
                    rating: number | null;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['outfits']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['outfits']['Row']>;
            };
            outfit_items: {
                Row: {
                    id: string;
                    outfit_id: string;
                    wardrobe_item_id: string;
                    created_at: string;
                };
                Insert: Omit<Database['public']['Tables']['outfit_items']['Row'], 'id' | 'created_at'>;
                Update: Partial<Database['public']['Tables']['outfit_items']['Row']>;
            };
        };
        Functions: {
            increment_times_worn: {
                Args: { item_id: string };
                Returns: undefined;
            };
        };
    };
};