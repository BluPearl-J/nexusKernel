/**
 * WardrobeAI — Tests
 * Written alongside features, not after.
 * Tests cover: kernel, services, and hooks.
 */
import { Kernel } from '../core/kernel';
import { WardrobeService } from '../services/wardrobe.service';
import type { Plugin } from '../core/kernel';

// ── Kernel Tests ──────────────────────────────────────────────────
describe('Kernel', () => {
    let kernel: Kernel;

    beforeEach(() => { kernel = new Kernel(); });

    it('registers a plugin successfully', async () => {
        const mockPlugin: Plugin = {
            name: 'test-plugin',
            version: '1.0.0',
            initialize: jest.fn().mockResolvedValue(undefined),
            destroy: jest.fn().mockResolvedValue(undefined),
        };

        await kernel.register(mockPlugin);
        expect(mockPlugin.initialize).toHaveBeenCalledWith(kernel);
    });

    it('throws when registering duplicate plugin', async () => {
        const plugin: Plugin = {
            name: 'dupe',
            version: '1.0.0',
            initialize: jest.fn().mockResolvedValue(undefined),
            destroy: jest.fn().mockResolvedValue(undefined),
        };

        await kernel.register(plugin);
        await expect(kernel.register(plugin)).rejects.toThrow(
            'Plugin "dupe" already registered'
        );
    });

    it('provides and resolves services', () => {
        const mockService = { doThing: jest.fn() };
        kernel.provide('TestService', mockService);
        const resolved = kernel.resolve<typeof mockService>('TestService');
        expect(resolved).toBe(mockService);
    });

    it('throws when resolving unknown service', () => {
        expect(() => kernel.resolve('UnknownService')).toThrow(
            'Service "UnknownService" not found in container'
        );
    });

    it('emits events to all registered handlers', async () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        kernel.on('test:event', handler1);
        kernel.on('test:event', handler2);
        await kernel.emit('test:event', { data: 'hello' });

        expect(handler1).toHaveBeenCalledWith({ data: 'hello' });
        expect(handler2).toHaveBeenCalledWith({ data: 'hello' });
    });

    it('removes event handlers correctly', async () => {
        const handler = jest.fn();
        kernel.on('test:event', handler);
        kernel.off('test:event', handler);
        await kernel.emit('test:event');
        expect(handler).not.toHaveBeenCalled();
    });
});

// ── WardrobeService Tests ─────────────────────────────────────────
jest.mock('../services/supabase', () => ({
    tables: {
        wardrobe: () => ({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        data: [{ id: '1', name: 'Blue Shirt', category: 'tops' }],
                        error: null,
                    }),
                }),
            }),
            insert: () => ({
                select: () => ({
                    single: () => ({
                        data: { id: '2', name: 'Black Jeans', category: 'bottoms' },
                        error: null,
                    }),
                }),
            }),
            delete: () => ({
                eq: () => ({ error: null }),
            }),
        }),
    },
}));

describe('WardrobeService', () => {
    it('returns items on getItems success', async () => {
        const result = await WardrobeService.getItems('user-123');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('Blue Shirt');
        }
    });
});

