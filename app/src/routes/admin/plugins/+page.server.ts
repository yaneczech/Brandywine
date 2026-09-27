import type { PageServerLoad } from './$types';
import { plugins as compiledPlugins } from '$lib/plugins';
import { listInstalled, pluginInstallsAllowed } from '$server/runtime-plugins';

export const load: PageServerLoad = async () => ({
	installed: await listInstalled(),
	compiled: compiledPlugins.map((p) => ({ id: p.id, name: p.name, version: p.version ?? '', description: p.description ?? '' })),
	installsAllowed: pluginInstallsAllowed(),
});
