/**
 * Block registry. Every folder in src/lib/blocks with an `index.ts` that
 * default-exports `defineBlock({...})` is a block type — adding a block means
 * adding a folder, nothing else. See docs/extending/blocks.md.
 */
import type { BlockDefinition } from './types';
import { BLOCK_GROUPS } from './types';

const modules = import.meta.glob<{ default: BlockDefinition }>('./*/index.ts', { eager: true });

function load(): BlockDefinition[] {
	const seen = new Map<string, string>();
	const list: BlockDefinition[] = [];
	for (const [path, mod] of Object.entries(modules)) {
		const def = mod.default;
		if (!def?.type) throw new Error(`${path} must default-export defineBlock({ type, ... })`);
		if (!/^[a-z][a-z0-9_]*$/.test(def.type)) throw new Error(`${path}: block type "${def.type}" must be lowercase snake_case`);
		const clash = seen.get(def.type);
		if (clash) throw new Error(`Block type "${def.type}" is defined twice (${clash}, ${path})`);
		seen.set(def.type, path);
		list.push(def);
	}
	return list.sort((a, b) =>
		BLOCK_GROUPS.indexOf(a.group) - BLOCK_GROUPS.indexOf(b.group) || a.order - b.order || a.type.localeCompare(b.type));
}

/** All block definitions, in picker order (group, then order). */
export const blockDefinitions: readonly BlockDefinition[] = load();
const byType = new Map(blockDefinitions.map((d) => [d.type, d]));

/** Every registered block type. */
export const BLOCK_TYPES: readonly string[] = blockDefinitions.map((d) => d.type);

export function getBlockDefinition(type: string): BlockDefinition | undefined {
	return byType.get(type);
}

export function isBlockType(type: unknown): type is string {
	return typeof type === 'string' && byType.has(type);
}

/**
 * Whether a block shows anything on the landing page: blocks that render brand
 * data or defaults always do; the rest only once they have some config.
 */
export function isLandingBlockVisible(block: {
	type: string; enabled: boolean; config: Record<string, unknown> | null;
}): boolean {
	return block.enabled && (
		Boolean(byType.get(block.type)?.rendersWithoutConfig) || Object.keys(block.config ?? {}).length > 0
	);
}

export { defineBlock } from './define';
export type * from './types';
export { BLOCK_GROUPS } from './types';
