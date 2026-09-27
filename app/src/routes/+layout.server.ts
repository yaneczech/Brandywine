import type { LayoutServerLoad } from './$types';
import { runtimePluginInfo } from '$server/runtime-plugins';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	depends('app:session');
	depends('app:plugins');
	return { user: locals.user, runtimePlugins: await runtimePluginInfo() };
};
