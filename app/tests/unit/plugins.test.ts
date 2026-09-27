import { describe, expect, it } from 'vitest';
import { enabledPluginIds, pluginFolder, plugins } from '../../src/lib/plugins';
import { EVENT_NAMES } from '../../src/lib/events';

describe('plugins', () => {
	it('only loads plugins enabled in plugins/plugins.json', () => {
		expect(plugins.every((p) => enabledPluginIds.includes(p.id))).toBe(true);
	});

	it('reads the folder name from an entry path', () => {
		expect(pluginFolder('/plugins/example/plugin.ts')).toBe('example');
	});

	it('lists every event once', () => {
		expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
	});
});
