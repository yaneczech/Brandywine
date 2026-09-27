/**
 * Plugin contract. A plugin is a folder in the installation's plugins/
 * directory with two optional entry files:
 *
 *   plugin.ts         client-safe: blocks, admin pages (components)
 *   plugin.server.ts  server-only: event hooks, page data loaders, API routes
 *
 * See docs/extending/plugins.md.
 */
import type { Component } from 'svelte';
import type { RequestEvent } from '@sveltejs/kit';
import type { BlockDefinition } from '$lib/blocks/types';
import type { IconComponent } from '$lib/icons';
import type { Role } from '$lib/auth/roles';
import type { ModuleGroup } from '$lib/modules/types';
import type { BrandywineEventName, BrandywineEvents } from '$lib/events';

/** An admin section added by a plugin; served at /admin/x/<plugin>/<module>/… */
export type PluginModule = {
	/** Unique within the plugin; part of the URL */
	id: string;
	label: () => string;
	icon: IconComponent;
	group: ModuleGroup;
	order: number;
	/** Lowest role that may open it (default: editor) */
	minRole?: Role;
	/**
	 * Page components by sub-path: '' is the module's start page, 'settings'
	 * is /admin/x/<plugin>/<module>/settings. Each receives `data` from the
	 * matching server loader, if any.
	 */
	pages: Record<string, Component<{ data: Record<string, unknown> }>>;
};

export type PluginDefinition = {
	/** Must equal the plugin's folder name; lowercase letters, digits and dashes */
	id: string;
	name: string;
	version?: string;
	description?: string;
	/** Manual block types the plugin adds (see docs/extending/blocks.md) */
	blocks?: BlockDefinition[];
	/** Admin sections the plugin adds */
	modules?: PluginModule[];
};

export type PluginEventHandlers = {
	[E in BrandywineEventName]?: (payload: BrandywineEvents[E]) => void | Promise<void>;
};

/** Server loader for a plugin admin page; its result is the page's `data` */
export type PluginPageLoad = (event: RequestEvent) => Record<string, unknown> | Promise<Record<string, unknown>>;

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/** Handlers for /api/x/<plugin>/<path>, by path and method. Callers must be signed-in editors. */
export type PluginApi = Record<string, Partial<Record<Method, (event: RequestEvent) => Response | Promise<Response>>>>;

export type PluginServerDefinition = {
	/** Same id as in plugin.ts */
	id: string;
	/** React to Brandywine events (see $lib/events). Errors are logged, never shown to the user. */
	on?: PluginEventHandlers;
	/** Data loaders for plugin admin pages: loaders[moduleId][subPath] */
	loaders?: Record<string, Record<string, PluginPageLoad>>;
	api?: PluginApi;
};

export function definePlugin(definition: PluginDefinition): PluginDefinition {
	return definition;
}

export function definePluginServer(definition: PluginServerDefinition): PluginServerDefinition {
	return definition;
}
