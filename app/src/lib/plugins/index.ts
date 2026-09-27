/**
 * Installed plugins (client-safe part). Every plugins/<id>/plugin.ts is
 * compiled into the app; the ones listed in plugins/plugins.json are active.
 */
import type { PluginDefinition } from './types';

const found = import.meta.glob<{ default: PluginDefinition }>('$plugins/*/plugin.ts', { eager: true });
const config = import.meta.glob<{ enabled?: string[] }>('$plugins/plugins.json', { eager: true, import: 'default' });

/** Plugin ids switched on in plugins/plugins.json */
export const enabledPluginIds: readonly string[] = Object.values(config)[0]?.enabled ?? [];

const ID = /^[a-z0-9][a-z0-9-]*$/;

/** Folder name of a plugin entry file path */
export function pluginFolder(path: string): string {
	return path.split('/').at(-2) ?? '';
}

function load(): PluginDefinition[] {
	const list: PluginDefinition[] = [];
	for (const [path, mod] of Object.entries(found)) {
		const def = mod.default;
		const folder = pluginFolder(path);
		if (!def?.id) throw new Error(`${path} must default-export definePlugin({ id, name, ... })`);
		if (def.id !== folder || !ID.test(def.id)) throw new Error(`${path}: plugin id "${def.id}" must equal its folder name and use a-z, 0-9 and dashes`);
		if (enabledPluginIds.includes(def.id)) list.push(def);
	}
	return list.sort((a, b) => a.id.localeCompare(b.id));
}

/** Active plugins, sorted by id */
export const plugins: readonly PluginDefinition[] = load();

export function getPlugin(id: string): PluginDefinition | undefined {
	return plugins.find((p) => p.id === id);
}

export { definePlugin } from './types';
export type { PluginDefinition, PluginModule } from './types';
