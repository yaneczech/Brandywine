/**
 * Admin pages of plugin modules: /admin/x/<plugin>/<module>/<sub-path>.
 * Compiled plugins provide Svelte pages; runtime plugins a custom element
 * (start page only). The admin layout has already checked the module's role.
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPlugin } from '$lib/plugins';
import { localize } from '$lib/plugins/runtime';
import { getLocale } from '$lib/paraglide/runtime';
import { getServerPlugin } from '$server/plugins';
import { getRuntimePlugin, pluginContext } from '$server/runtime-plugins';

export const load: PageServerLoad = async (event) => {
	const { plugin, module, path } = event.params;

	const compiled = getPlugin(plugin)?.modules?.find((m) => m.id === module);
	if (compiled) {
		if (!Object.hasOwn(compiled.pages, path)) error(404, 'Not found');
		const loader = getServerPlugin(plugin)?.loaders?.[module]?.[path];
		return {
			plugin, module, path, element: null,
			title: compiled.label(),
			pluginData: loader ? await loader(event) : {},
		};
	}

	const runtime = await getRuntimePlugin(plugin);
	const mod = runtime?.manifest.modules?.find((m) => m.id === module);
	if (!runtime || !mod || path !== '') error(404, 'Not found');
	const user = event.locals.user;
	const ctx = pluginContext(runtime, user ? { id: user.id, email: user.email, role: user.role } : null);
	const loader = runtime.server?.loaders?.[module];
	return {
		plugin, module, path, element: mod.element,
		title: localize(mod.label, getLocale()),
		pluginData: loader ? await loader(ctx) : {},
	};
};
