/**
 * Admin module registry. Every folder in src/lib/modules with an `index.ts`
 * that default-exports `defineModule({...})` adds a sidebar entry and an
 * access rule; its pages live in src/routes/admin/<id>/.
 * See docs/extending/modules.md.
 */
import * as m from '$lib/paraglide/messages';
import { hasRole } from '$lib/auth/roles';
import { MODULE_GROUPS, type AdminModule, type ModuleGroup } from './types';

const found = import.meta.glob<{ default: AdminModule }>('./*/index.ts', { eager: true });

function load(): AdminModule[] {
	const seen = new Map<string, string>();
	const list: AdminModule[] = [];
	for (const [path, mod] of Object.entries(found)) {
		const def = mod.default;
		if (!def?.id || !def.href?.startsWith('/admin')) throw new Error(`${path} must default-export defineModule({ id, href: '/admin…', ... })`);
		const clash = seen.get(def.id);
		if (clash) throw new Error(`Admin module "${def.id}" is defined twice (${clash}, ${path})`);
		seen.set(def.id, path);
		list.push(def);
	}
	return list.sort((a, b) =>
		MODULE_GROUPS.indexOf(a.group) - MODULE_GROUPS.indexOf(b.group) || a.order - b.order || a.id.localeCompare(b.id));
}

export const adminModules: readonly AdminModule[] = load();

const GROUP_LABELS: Record<ModuleGroup, () => string> = {
	brand: m.admin_group_brand,
	assets: m.admin_group_assets,
	admin: m.admin_group_admin,
};

/** Sidebar groups with the modules this role may see; empty groups are left out. */
export function adminNav(role: string | null | undefined) {
	return MODULE_GROUPS
		.map((group) => ({
			group,
			label: GROUP_LABELS[group](),
			items: adminModules.filter((mod) => mod.group === group && hasRole(role, mod.minRole ?? 'editor')),
		}))
		.filter((g) => g.items.length);
}

/** The module a path belongs to (longest matching href), if any. */
export function moduleForPath(pathname: string): AdminModule | undefined {
	let best: AdminModule | undefined;
	for (const mod of adminModules) {
		const inside = mod.href === '/admin' ? pathname === '/admin' : pathname === mod.href || pathname.startsWith(mod.href + '/');
		if (inside && (!best || mod.href.length > best.href.length)) best = mod;
	}
	return best;
}

export { defineModule, MODULE_GROUPS } from './types';
export type { AdminModule, ModuleGroup } from './types';
