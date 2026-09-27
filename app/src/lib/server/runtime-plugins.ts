/**
 * Runtime plugins on the server: install from a zip, enable/disable,
 * load server.js without a rebuild, render their blocks, run their event
 * handlers, API routes and page loaders.
 *
 * Files:  RUNTIME_PLUGINS_DIR/<id>/  (manifest.json, server.js, client.js, public/…)
 * State:  runtime_plugins table (enabled flag + manifest), plugin_data (storage)
 */
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile, rename, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$db';
import { pluginData, runtimePlugins } from '$db/schema';
import { BLOCK_TYPES, setRuntimeBlocks } from '$lib/blocks';
import { plugins as compiledPlugins } from '$lib/plugins';
import {
	elementHtml, renderTemplate, runtimeBlockDefinitions, validateManifest,
	type PluginManifest, type RuntimePluginInfo,
} from '$lib/plugins/runtime';
import type { BrandywineEventName } from '$lib/events';
import { stripCommonFolder, unzip } from './unzip';

export const RUNTIME_PLUGINS_DIR = resolve(env.RUNTIME_PLUGINS_DIR ?? './runtime-plugins');

/** PLUGIN_INSTALLS=disabled turns off uploading and updating plugins in the admin */
export function pluginInstallsAllowed(): boolean {
	return env.PLUGIN_INSTALLS !== 'disabled';
}

// ── What server.js may export ──────────────────────────────────────────────
export type PluginContext = {
	plugin: { id: string; version: string };
	/** The signed-in user, when the call comes from a request */
	user: { id: string; email: string; role: string } | null;
	/** Small JSON key-value store, private to the plugin */
	storage: {
		get<T = unknown>(key: string): Promise<T | undefined>;
		set(key: string, value: unknown): Promise<void>;
		delete(key: string): Promise<void>;
		list(): Promise<string[]>;
	};
	log: (...args: unknown[]) => void;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type RuntimeServerModule = {
	on?: Partial<Record<BrandywineEventName, (payload: unknown, ctx: PluginContext) => unknown>>;
	/** /api/x/<plugin>/<path>: return a Response or any JSON-serialisable value */
	api?: Record<string, Partial<Record<Method, (request: Request, ctx: PluginContext) => unknown>>>;
	/** Data for admin pages, by module id; passed to the page element as `data` */
	loaders?: Record<string, (ctx: PluginContext) => unknown>;
	/** HTML of a block, by block type; overrides the manifest template */
	render?: Record<string, (config: Record<string, unknown>, ctx: PluginContext) => string | Promise<string>>;
	/** Markdown of a block for the AI export, by block type */
	toMarkdown?: Record<string, (config: Record<string, unknown>) => string>;
};

type Loaded = { id: string; version: string; manifest: PluginManifest; server: RuntimeServerModule | null };

// import() that bypasses the bundler: plugin code is plain ESM on disk
const nativeImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<{ default?: RuntimeServerModule }>;

let loaded: Loaded[] | null = null;
let loading: Promise<Loaded[]> | null = null;

function pluginDir(id: string) {
	return join(RUNTIME_PLUGINS_DIR, id);
}

async function importServer(id: string, manifest: PluginManifest): Promise<RuntimeServerModule | null> {
	const file = join(pluginDir(id), manifest.server ?? 'server.js');
	if (!existsSync(file)) return null;
	const { mtimeMs } = await stat(file);
	// The query makes Node load a fresh copy after an update
	const mod = await nativeImport(`${pathToFileURL(file).href}?v=${encodeURIComponent(manifest.version)}-${Math.round(mtimeMs)}`);
	return mod.default ?? null;
}

async function load(): Promise<Loaded[]> {
	const rows = await db.select().from(runtimePlugins).where(eq(runtimePlugins.enabled, true));
	const list: Loaded[] = [];
	for (const row of rows) {
		try {
			const manifest = validateManifest(row.manifest);
			list.push({ id: row.id, version: row.version, manifest, server: await importServer(row.id, manifest) });
		} catch (e) {
			console.error(`[plugin ${row.id}] could not be loaded:`, e);
		}
	}
	const markdown = Object.fromEntries(list.flatMap((p) => Object.entries(p.server?.toMarkdown ?? {})));
	setRuntimeBlocks(runtimeBlockDefinitions(list.map((p) => p.manifest), markdown));
	return list;
}

/** Enabled runtime plugins, loaded once and after every change */
export async function activeRuntimePlugins(): Promise<Loaded[]> {
	if (loaded) return loaded;
	loading ??= load().then((list) => (loaded = list)).finally(() => (loading = null));
	return loading;
}

export async function reloadRuntimePlugins(): Promise<void> {
	loaded = null;
	await activeRuntimePlugins();
}

export async function getRuntimePlugin(id: string): Promise<Loaded | undefined> {
	return (await activeRuntimePlugins()).find((p) => p.id === id);
}

/** What the browser needs: manifests and client.js URLs of enabled plugins */
export async function runtimePluginInfo(): Promise<RuntimePluginInfo[]> {
	return (await activeRuntimePlugins()).map((p) => {
		const client = p.manifest.client ?? 'client.js';
		return {
			id: p.id, version: p.version, manifest: p.manifest,
			clientUrl: existsSync(join(pluginDir(p.id), client)) ? `/plugin-assets/${p.id}/${p.version}/${client}` : null,
		};
	});
}

// ── Context ────────────────────────────────────────────────────────────────
export function pluginContext(plugin: { id: string; version: string }, user: PluginContext['user'] = null): PluginContext {
	const where = (key: string) => and(eq(pluginData.pluginId, plugin.id), eq(pluginData.key, key));
	return {
		plugin, user,
		storage: {
			async get<T>(key: string) {
				const [row] = await db.select({ value: pluginData.value }).from(pluginData).where(where(key));
				return row?.value as T | undefined;
			},
			async set(key, value) {
				await db.insert(pluginData).values({ pluginId: plugin.id, key, value, updatedAt: new Date() })
					.onConflictDoUpdate({ target: [pluginData.pluginId, pluginData.key], set: { value, updatedAt: new Date() } });
			},
			async delete(key) {
				await db.delete(pluginData).where(where(key));
			},
			async list() {
				return (await db.select({ key: pluginData.key }).from(pluginData).where(eq(pluginData.pluginId, plugin.id))).map((r) => r.key);
			},
		},
		log: (...args) => console.log(`[plugin ${plugin.id}]`, ...args),
	};
}

// ── Blocks ─────────────────────────────────────────────────────────────────
/** Server-rendered HTML for the runtime-plugin blocks among `blocks`, by block id */
export async function renderRuntimeBlocks(blocks: { id: string; type: string; config: unknown }[]): Promise<Record<string, string>> {
	const active = await activeRuntimePlugins();
	const out: Record<string, string> = {};
	for (const block of blocks) {
		const plugin = active.find((p) => p.manifest.blocks?.some((b) => b.type === block.type));
		const spec = plugin?.manifest.blocks?.find((b) => b.type === block.type);
		if (!plugin || !spec) continue;
		const config = (block.config ?? {}) as Record<string, unknown>;
		try {
			const render = plugin.server?.render?.[block.type];
			out[block.id] = render
				? await render(config, pluginContext(plugin))
				: spec.template ? renderTemplate(spec.template, config) : spec.element ? elementHtml(spec.element, config) : '';
		} catch (e) {
			console.error(`[plugin ${plugin.id}] rendering ${block.type} failed:`, e);
			out[block.id] = '';
		}
	}
	return out;
}

// ── Install / enable / remove ──────────────────────────────────────────────
export async function listInstalled() {
	return db.select().from(runtimePlugins).orderBy(runtimePlugins.id);
}

/** Unpack a plugin zip into RUNTIME_PLUGINS_DIR and record it (disabled on first install). */
export async function installPackage(zip: Uint8Array): Promise<PluginManifest> {
	if (!pluginInstallsAllowed()) throw new Error('Installing plugins is disabled on this server (PLUGIN_INSTALLS=disabled)');
	const files = stripCommonFolder(unzip(zip));
	const manifestFile = files.find((f) => f.path === 'manifest.json');
	if (!manifestFile) throw new Error('The package has no manifest.json at its root');
	let raw: unknown;
	try {
		raw = JSON.parse(new TextDecoder().decode(manifestFile.data));
	} catch {
		throw new Error('manifest.json is not valid JSON');
	}
	const manifest = validateManifest(raw);
	if (compiledPlugins.some((p) => p.id === manifest.id)) throw new Error(`A built-in plugin is already called "${manifest.id}"`);
	const clash = manifest.blocks?.find((b) => BLOCK_TYPES.includes(b.type));
	if (clash) throw new Error(`Block type "${clash.type}" already exists`);
	const [otherOwner] = (await listInstalled()).filter((p) => p.id !== manifest.id && p.manifest.blocks?.some((b) => manifest.blocks?.some((n) => n.type === b.type)));
	if (otherOwner) throw new Error(`Plugin "${otherOwner.id}" already defines one of these block types`);

	// Write to a temporary folder, then swap it in
	await mkdir(RUNTIME_PLUGINS_DIR, { recursive: true });
	const target = pluginDir(manifest.id);
	const staging = `${target}.installing-${Date.now()}`;
	try {
		for (const file of files) {
			const out = join(staging, file.path);
			if (!resolve(out).startsWith(resolve(staging) + '/')) throw new Error(`Unsafe path in package: ${file.path}`);
			await mkdir(dirname(out), { recursive: true });
			await writeFile(out, file.data);
		}
		await rm(target, { recursive: true, force: true });
		await rename(staging, target);
	} catch (e) {
		await rm(staging, { recursive: true, force: true });
		throw e;
	}

	await db.insert(runtimePlugins)
		.values({ id: manifest.id, version: manifest.version, manifest, enabled: false })
		.onConflictDoUpdate({ target: runtimePlugins.id, set: { version: manifest.version, manifest, updatedAt: new Date() } });
	await reloadRuntimePlugins();
	return manifest;
}

export async function setPluginEnabled(id: string, enabled: boolean): Promise<boolean> {
	const [row] = await db.update(runtimePlugins).set({ enabled, updatedAt: new Date() }).where(eq(runtimePlugins.id, id)).returning();
	await reloadRuntimePlugins();
	return Boolean(row);
}

/** Remove a plugin's files and record. Its stored data and blocks stay, so a reinstall picks them up again. */
export async function uninstallPlugin(id: string): Promise<boolean> {
	const [row] = await db.delete(runtimePlugins).where(eq(runtimePlugins.id, id)).returning({ id: runtimePlugins.id });
	if (row) await rm(pluginDir(id), { recursive: true, force: true });
	await reloadRuntimePlugins();
	return Boolean(row);
}

/** Absolute path of a publicly served plugin file, or null (only client.js and public/…) */
export async function pluginAssetPath(id: string, version: string, file: string): Promise<string | null> {
	const plugin = await getRuntimePlugin(id);
	if (!plugin || plugin.version !== version) return null;
	const client = plugin.manifest.client ?? 'client.js';
	if (file !== client && !file.startsWith('public/')) return null;
	const root = resolve(pluginDir(id));
	const full = resolve(root, file);
	return full.startsWith(root + '/') && existsSync(full) ? full : null;
}
