import type { IconComponent } from '$lib/icons';
import type { Role } from '$lib/auth/roles';

/** Sidebar groups, in display order. */
export const MODULE_GROUPS = ['brand', 'assets', 'admin'] as const;
export type ModuleGroup = (typeof MODULE_GROUPS)[number];

/**
 * An admin module: one entry in the admin sidebar plus the access rule for
 * everything under its `href`. Its pages live in src/routes/admin/<id>/.
 */
export type AdminModule = {
	/** Unique id, usually the route folder name */
	id: string;
	/** Admin URL; every path under it belongs to the module */
	href: string;
	group: ModuleGroup;
	/** Position inside the group (lower first) */
	order: number;
	icon: IconComponent;
	/** Sidebar label; a function so it follows the UI language */
	label: () => string;
	/** Lowest role that sees the module and may open its pages (default: editor) */
	minRole?: Role;
};

export function defineModule(module: AdminModule): AdminModule {
	return module;
}
