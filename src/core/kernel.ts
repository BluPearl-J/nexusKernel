/**
 * WardrobeAI — Microkernel Core
 * The kernel manages plugin registration, dependency injection,
 * and the event bus. Plugins are independent and swappable.
 */

export interface Plugin {
    name: string;
    version: string;
    initialize(kernel: Kernel): Promise<void>;
    destroy(): Promise<void>;
}

type EventHandler = (payload: unknown) => void | Promise<void>;

export class Kernel {
    private plugins = new Map<string, Plugin>();
    private services = new Map<string, unknown>();
    private eventBus = new Map<string, EventHandler[]>();

    // ── Plugin Registry ──────────────────────────────────────
    async register(plugin: Plugin): Promise<void> {
        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin "${plugin.name}" already registered`);
        }
        await plugin.initialize(this);
        this.plugins.set(plugin.name, plugin);
        console.log(`[Kernel] Plugin registered: ${plugin.name}@${plugin.version}`);
    }

    async unregister(name: string): Promise<void> {
        const plugin = this.plugins.get(name);
        if (!plugin) throw new Error(`Plugin "${name}" not found`);
        await plugin.destroy();
        this.plugins.delete(name);
    }

    // ── Dependency Injection ─────────────────────────────────
    provide<T>(token: string, service: T): void {
        this.services.set(token, service);
    }

    resolve<T>(token: string): T {
        const service = this.services.get(token);
        if (!service) throw new Error(`Service "${token}" not found in container`);
        return service as T;
    }

    // ── Event Bus ────────────────────────────────────────────
    on(event: string, handler: EventHandler): void {
        const handlers = this.eventBus.get(event) ?? [];
        this.eventBus.set(event, [...handlers, handler]);
    }

    async emit(event: string, payload?: unknown): Promise<void> {
        const handlers = this.eventBus.get(event) ?? [];
        await Promise.all(handlers.map((h) => h(payload)));
    }

    off(event: string, handler: EventHandler): void {
        const handlers = this.eventBus.get(event) ?? [];
        this.eventBus.set(event, handlers.filter((h) => h !== handler));
    }
}

// Singleton kernel instance
export const kernel = new Kernel();
