/**
 * Runtime plugins — installed from a zip in Admin → Plugins, no rebuild.
 * A package holds manifest.json (declarative: blocks with editor fields,
 * admin pages as custom elements) and optionally server.js (event handlers,
 * API, block rendering) and client.js (custom elements). This module is
 * client-safe: the manifest types, their validation and the block
 * definitions built from them. See docs/extending/runtime-plugins.md.
 */
import * as icons from '$lib/icons';
import type { IconComponent } from '$lib/icons';
import { BLOCK_GROUPS, type BlockDefinition, type BlockGroup } from '$lib/blocks/types';
import { MODULE_GROUPS, type AdminModule, type ModuleGroup } from '$lib/modules/types';
import { ROLES, type Role } from '$lib/auth/roles';
import RuntimeBlockRender from './RuntimeBlockRender.svelte';
import RuntimeBlockEditor from './RuntimeBlockEditor.svelte';

/** Text in several languages; English is the fallback */
export type LocalizedText = { en: string } & Partial<Record<string, string>>;

export const FIELD_TYPES = ['text', 'textarea', 'number', 'boolean', 'select', 'color', 'url', 'image'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export type FieldSpec = {
	key: string;
	type: FieldType;
	label: LocalizedText;
	/** The audit reports the block as empty while a required field is empty */
	required?: boolean;
	/** Choices of a `select` field */
	options?: { value: string; label: LocalizedText }[];
	default?: string | number | boolean;
	hint?: LocalizedText;
};

export type ManifestBlock = {
	/** Must start with the plugin id: plugin `hello` → `hello_banner` */
	type: string;
	label: LocalizedText;
	description?: LocalizedText;
	group: BlockGroup;
	order?: number;
	/** Name of an icon in $lib/icons, e.g. "IconInfoCircle" */
	icon?: string;
	/** Form fields of the editor; ignored when `editorElement` is set */
	fields?: FieldSpec[];
	/**
	 * HTML with {{field}} placeholders (values are HTML-escaped). Used when
	 * server.js has no render function for the block.
	 */
	template?: string;
	/** Custom element (defined in client.js) that renders the block; gets the config as JSON in `data-config` */
	element?: string;
	/** Custom element that replaces the generated editor form; emits `change` events with the new config in `detail` */
	editorElement?: string;
	rendersWithoutConfig?: boolean;
};

export type ManifestModule = {
	/** Part of the URL: /admin/x/<plugin>/<id> */
	id: string;
	label: LocalizedText;
	icon?: string;
	group: ModuleGroup;
	order?: number;
	minRole?: Role;
	/** Custom element (defined in client.js) that renders the page; gets server data as its `data` property */
	element: string;
};

export type PluginManifest = {
	id: string;
	name: string;
	version: string;
	description?: string;
	/** Brandywine versions the plugin was built for (informational) */
	brandywine?: string;
	/** Paths inside the package; default server.js / client.js when present */
	server?: string;
	client?: string;
	blocks?: ManifestBlock[];
	modules?: ManifestModule[];
};

/** What the browser needs to know about an enabled runtime plugin */
export type RuntimePluginInfo = {
	id: string;
	version: string;
	manifest: PluginManifest;
	/** URL of client.js, when the plugin has one */
	clientUrl: string | null;
};

const ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
const KEY = /^[a-z][a-zA-Z0-9_]{0,63}$/;
const TAG = /^[a-z][a-z0-9]*-[a-z0-9-]+$/;
const FILE = /^[\w./-]{1,200}$/;

function localized(value: unknown, where: string): LocalizedText {
	if (typeof value === 'string' && value.trim()) return { en: value };
	if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).en === 'string') {
		const out: Record<string, string> = {};
		for (const [k, v] of Object.entries(value)) if (typeof v === 'string' && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(k)) out[k] = v;
		return out as LocalizedText;
	}
	throw new Error(`${where}: expected text or { "en": "…", "cs": "…" }`);
}

/**
 * Check a manifest.json and return it normalised. Throws with a readable
 * message on the first problem.
 */
export function validateManifest(raw: unknown): PluginManifest {
	if (!raw || typeof raw !== 'object') throw new Error('manifest.json must contain an object');
	const m = raw as Record<string, unknown>;
	if (typeof m.id !== 'string' || !ID.test(m.id)) throw new Error('manifest.id: lowercase letters, digits and dashes, up to 48 characters');
	if (typeof m.name !== 'string' || !m.name.trim()) throw new Error('manifest.name is required');
	if (typeof m.version !== 'string' || !/^\d+\.\d+\.\d+([-+][\w.]+)?$/.test(m.version)) throw new Error('manifest.version must look like 1.0.0');
	for (const f of ['server', 'client'] as const) {
		if (m[f] !== undefined && (typeof m[f] !== 'string' || !FILE.test(m[f] as string) || (m[f] as string).includes('..'))) throw new Error(`manifest.${f} must be a relative file path`);
	}
	const id = m.id;
	const blocks = (Array.isArray(m.blocks) ? m.blocks : m.blocks === undefined ? [] : null);
	if (!blocks) throw new Error('manifest.blocks must be a list');
	const modules = (Array.isArray(m.modules) ? m.modules : m.modules === undefined ? [] : null);
	if (!modules) throw new Error('manifest.modules must be a list');

	const blockTypes = new Set<string>();
	const outBlocks: ManifestBlock[] = blocks.map((b: Record<string, unknown>, i: number) => {
		const where = `blocks[${i}]`;
		const prefix = id.replace(/-/g, '_') + '_';
		if (typeof b.type !== 'string' || !/^[a-z][a-z0-9_]*$/.test(b.type) || !b.type.startsWith(prefix)) {
			throw new Error(`${where}.type must be snake_case and start with "${prefix}"`);
		}
		if (blockTypes.has(b.type)) throw new Error(`${where}.type "${b.type}" is used twice`);
		blockTypes.add(b.type);
		if (!BLOCK_GROUPS.includes(b.group as BlockGroup)) throw new Error(`${where}.group must be one of ${BLOCK_GROUPS.join(', ')}`);
		for (const t of ['element', 'editorElement'] as const) {
			if (b[t] !== undefined && (typeof b[t] !== 'string' || !TAG.test(b[t] as string))) throw new Error(`${where}.${t} must be a custom element name with a dash`);
		}
		if (b.template !== undefined && typeof b.template !== 'string') throw new Error(`${where}.template must be text`);
		const fields = Array.isArray(b.fields) ? b.fields : [];
		const keys = new Set<string>();
		const outFields: FieldSpec[] = fields.map((f: Record<string, unknown>, j: number) => {
			const fw = `${where}.fields[${j}]`;
			if (typeof f.key !== 'string' || !KEY.test(f.key) || keys.has(f.key)) throw new Error(`${fw}.key must be a unique camelCase name`);
			keys.add(f.key);
			if (!FIELD_TYPES.includes(f.type as FieldType)) throw new Error(`${fw}.type must be one of ${FIELD_TYPES.join(', ')}`);
			const options = f.type === 'select'
				? (Array.isArray(f.options) ? f.options : []).map((o: Record<string, unknown>, k: number) => ({
					value: String(o?.value ?? ''), label: localized(o?.label ?? o?.value, `${fw}.options[${k}]`),
				}))
				: undefined;
			if (f.type === 'select' && !options?.length) throw new Error(`${fw}: a select needs options`);
			return {
				key: f.key, type: f.type as FieldType, label: localized(f.label, `${fw}.label`),
				required: f.required === true, options,
				default: ['string', 'number', 'boolean'].includes(typeof f.default) ? f.default as FieldSpec['default'] : undefined,
				hint: f.hint === undefined ? undefined : localized(f.hint, `${fw}.hint`),
			};
		});
		return {
			type: b.type, label: localized(b.label, `${where}.label`),
			description: b.description === undefined ? undefined : localized(b.description, `${where}.description`),
			group: b.group as BlockGroup, order: typeof b.order === 'number' ? b.order : 100,
			icon: typeof b.icon === 'string' ? b.icon : undefined,
			fields: outFields, template: b.template as string | undefined,
			element: b.element as string | undefined, editorElement: b.editorElement as string | undefined,
			rendersWithoutConfig: b.rendersWithoutConfig === true,
		};
	});

	const moduleIds = new Set<string>();
	const outModules: ManifestModule[] = modules.map((mod: Record<string, unknown>, i: number) => {
		const where = `modules[${i}]`;
		if (typeof mod.id !== 'string' || !ID.test(mod.id) || moduleIds.has(mod.id)) throw new Error(`${where}.id must be unique, lowercase with dashes`);
		moduleIds.add(mod.id);
		if (!MODULE_GROUPS.includes(mod.group as ModuleGroup)) throw new Error(`${where}.group must be one of ${MODULE_GROUPS.join(', ')}`);
		if (typeof mod.element !== 'string' || !TAG.test(mod.element)) throw new Error(`${where}.element must be a custom element name with a dash`);
		if (mod.minRole !== undefined && !ROLES.includes(mod.minRole as Role)) throw new Error(`${where}.minRole must be one of ${ROLES.join(', ')}`);
		return {
			id: mod.id, label: localized(mod.label, `${where}.label`), group: mod.group as ModuleGroup,
			order: typeof mod.order === 'number' ? mod.order : 100,
			icon: typeof mod.icon === 'string' ? mod.icon : undefined,
			minRole: (mod.minRole as Role | undefined) ?? 'editor', element: mod.element,
		};
	});

	return {
		id, name: m.name.trim(), version: m.version,
		description: typeof m.description === 'string' ? m.description : undefined,
		brandywine: typeof m.brandywine === 'string' ? m.brandywine : undefined,
		server: m.server as string | undefined, client: m.client as string | undefined,
		blocks: outBlocks, modules: outModules,
	};
}

/** Pick the text for a language, falling back to English */
export function localize(text: LocalizedText | undefined, locale: string): string {
	return text ? (text[locale] ?? text.en) : '';
}

export function iconByName(name: string | undefined): IconComponent {
	const found = name ? (icons as Record<string, unknown>)[name] : undefined;
	return (typeof found === 'function' ? found : icons.IconExtension) as IconComponent;
}

function escapeHtml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Fill {{field}} placeholders with HTML-escaped config values */
export function renderTemplate(template: string, config: Record<string, unknown>): string {
	return template.replace(/\{\{\s*([a-zA-Z][\w]*)\s*\}\}/g, (_, key: string) => {
		const value = config[key];
		return value === undefined || value === null ? '' : escapeHtml(String(value));
	});
}

/** Markup for a block rendered by a custom element; the config travels as JSON */
export function elementHtml(tag: string, config: Record<string, unknown>): string {
	return `<${tag} data-config="${escapeHtml(JSON.stringify(config))}"></${tag}>`;
}

// ── Block definitions ──────────────────────────────────────────────────────
const specs = new Map<string, { plugin: string; block: ManifestBlock }>();

/** The manifest entry behind a runtime block type */
export function runtimeBlockSpec(type: string): ManifestBlock | undefined {
	return specs.get(type)?.block;
}

/**
 * Block definitions for the blocks of enabled runtime plugins. The server may
 * pass `toMarkdown` overrides from server.js.
 */
export function runtimeBlockDefinitions(
	manifests: PluginManifest[],
	markdown: Record<string, (config: Record<string, unknown>) => string> = {},
): BlockDefinition[] {
	specs.clear();
	const defs: BlockDefinition[] = [];
	for (const manifest of manifests) {
		for (const block of manifest.blocks ?? []) {
			specs.set(block.type, { plugin: manifest.id, block });
			const fields = block.fields ?? [];
			defs.push({
				type: block.type,
				group: block.group,
				order: block.order ?? 100,
				icon: iconByName(block.icon),
				Render: RuntimeBlockRender,
				Editor: RuntimeBlockEditor,
				rendersWithoutConfig: block.rendersWithoutConfig,
				label: block.label,
				description: block.description,
				audit(c, { str, empty }) {
					if (fields.some((f) => f.required && !str(String(c[f.key] ?? '')))) empty();
				},
				toMarkdown: markdown[block.type]
					?? ((c, { str }) => fields.map((f) => str(String(c[f.key] ?? ''))).filter(Boolean).join('\n\n')),
			});
		}
	}
	return defs;
}

// ── Admin modules ──────────────────────────────────────────────────────────
/** Sidebar entries for the admin pages of runtime plugins (served at /admin/x/<plugin>/<module>) */
export function runtimeModules(manifests: PluginManifest[], locale: () => string): AdminModule[] {
	return manifests.flatMap((manifest) => (manifest.modules ?? []).map((mod) => ({
		id: `${manifest.id}/${mod.id}`,
		href: `/admin/x/${manifest.id}/${mod.id}`,
		group: mod.group,
		order: mod.order ?? 100,
		icon: iconByName(mod.icon),
		label: () => localize(mod.label, locale()),
		minRole: mod.minRole ?? 'editor',
	})));
}
