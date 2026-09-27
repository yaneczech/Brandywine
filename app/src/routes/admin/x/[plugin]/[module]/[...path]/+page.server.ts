/**
 * Admin pages of plugin modules: /admin/x/<plugin>/<module>/<sub-path>.
 * The admin layout has already checked the module's role (see $lib/modules).
 */
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPlugin } from '$lib/plugins';
import { getServerPlugin } from '$server/plugins';

export const load: PageServerLoad = async (event) => {
	const { plugin, module, path } = event.params;
	const mod = getPlugin(plugin)?.modules?.find((m) => m.id === module);
	if (!mod || !Object.hasOwn(mod.pages, path)) error(404, 'Not found');
	const loader = getServerPlugin(plugin)?.loaders?.[module]?.[path];
	return {
		plugin, module, path,
		title: mod.label(),
		pluginData: loader ? await loader(event) : {},
	};
};
