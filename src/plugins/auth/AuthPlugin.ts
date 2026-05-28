/**
 * WardrobeAI — Auth Plugin
 * Handles all authentication via Supabase Auth.
 * Registered as a plugin into the kernel.
 */

import { supabase } from '../../services/supabase';
import type { Kernel, Plugin } from '../../core/kernel';
import type { User, Result } from '../../models';

export interface AuthService {
    signUp(email: string, password: string, fullName: string): Promise<Result<User>>;
    signIn(email: string, password: string): Promise<Result<User>>;
    signOut(): Promise<Result<void>>;
    getSession(): Promise<User | null>;
    onAuthStateChange(cb: (user: User | null) => void): () => void;
}

class AuthPluginImpl implements Plugin {
    name = 'auth';
    version = '1.0.0';
    private kernel!: Kernel;

    async initialize(kernel: Kernel): Promise<void> {
        this.kernel = kernel;
        kernel.provide<AuthService>('AuthService', this.createService());
    }

    async destroy(): Promise<void> {
        await supabase.auth.signOut();
    }

    private createService(): AuthService {
        return {
            signUp: async (email, password, fullName) => {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } },
                });

                if (error) return { success: false, error: error.message };
                if (!data.user) return { success: false, error: 'No user returned' };

                const user = this.mapToUser(data.user);
                await this.kernel.emit('auth:signed-up', user);
                return { success: true, data: user };
            },

            signIn: async (email, password) => {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) return { success: false, error: error.message };
                if (!data.user) return { success: false, error: 'Sign in failed' };

                const user = this.mapToUser(data.user);
                await this.kernel.emit('auth:signed-in', user);
                return { success: true, data: user };
            },

            signOut: async () => {
                const { error } = await supabase.auth.signOut();
                if (error) return { success: false, error: error.message };
                await this.kernel.emit('auth:signed-out');
                return { success: true, data: undefined };
            },

            getSession: async () => {
                const { data } = await supabase.auth.getSession();
                if (!data.session?.user) return null;
                return this.mapToUser(data.session.user);
            },

            onAuthStateChange: (cb) => {
                const { data } = supabase.auth.onAuthStateChange((_, session) => {
                    cb(session?.user ? this.mapToUser(session.user) : null);
                });
                return () => data.subscription.unsubscribe();
            },
        };
    }

    private mapToUser(supabaseUser: any): User {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email ?? '',
            full_name: supabaseUser.user_metadata?.full_name ?? '',
            avatar_url: supabaseUser.user_metadata?.avatar_url ?? null,
            style_profile: null,
            created_at: supabaseUser.created_at,
        };
    }
}

export const AuthPlugin = new AuthPluginImpl();
