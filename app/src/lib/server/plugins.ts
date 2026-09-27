/**
 * Installed plugins (server part): event handlers, admin page loaders and
 * API routes from plugins/<id>/plugin.server.ts of active plugins.
 */
import type { PluginServerDefinition } from '$lib/plugins/types';
import { enabledPluginIds, pluginFolder } from '$lib/plugins';

const found = import.meta.glob<{ default: PluginServerDefinition }>('$plugins/*/plugin.server.ts', { eager: true });

function load(): PluginServerDefinition[] {
	const list: PluginServerDefinition[] = [];
	for (const [path, mod] of Object.entries(found)) {
		const def = mod.default;
		if (!def?.id || def.id !== pluginFolder(path)) {
			throw new Error(`${path} must default-export definePluginServer({ id: '<folder name>', ... })`);
		}
		if (enabledPluginIds.includes(def.id)) list.push(def);
	}
	return list;
}

export const serverPlugins: readonly PluginServerDefinition[] = load();

export function getServerPlugin(id: string): PluginServerDefinition | undefined {
	return serverPlugins.find((p) => p.id === id);
}
