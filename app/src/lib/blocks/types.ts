/**
 * Types shared by every manual block: the stored block row, the brand data a
 * block can read while rendering, and the shape of a block definition.
 */
import type { Component } from 'svelte';
import type { IconComponent } from '$lib/icons';

/** A block as stored in `manual_blocks`. `config` is free-form per block type. */
export type Block = {
	id: string;
	type: string;
	config: Record<string, unknown>;
	anchor: string | null;
	enabled: boolean;
};

export type ProductionRef = { type: 'pantone' | 'ral' | 'ncs' | 'foil' | 'other'; label: string; value: string };
export type ColorRow = {
	id: string; name: string; hex: string;
	rgb: { r: number; g: number; b: number } | null;
	cmyk: { c: number; m: number; y: number; k: number } | null;
	hsl: { h: number; s: number; l: number } | null;
	pantoneRef: string | null; ralRef: string | null;
	productionRefs?: ProductionRef[] | null;
	paletteId: string | null; order: number;
};
export type PaletteRow = { id: string; name: string; order: number };
export type FontRow = {
	id: string; name: string; foundry: string | null; role: string | null; license?: string | null;
	sourceUrl: string | null; weights: number[] | null; isVariable: boolean | null;
	variableAxes?: { tag: string; label: string; min: number; max: number; default: number }[] | null;
	order: number;
};
export type StyleRow = {
	id: string; fontId: string | null; name: string; tag: string | null; size: number | null;
	lineHeight: number | null; tracking: number | null; weight: number | null; order: number;
};
export type FontFileRow = { id: string; fontId: string; storagePath: string; format: string; isVariable: boolean | null; fileSize?: number | null };
export type AssetRow = {
	id: string; filename: string; mime: string; size: number; storagePath: string;
	thumbnailPath: string | null; folderId: string | null; tags: string[] | null;
};

/** Brand data loaded once per manual page and handed to every block. */
export type BlockData = {
	colorRows: ColorRow[];
	paletteRows: PaletteRow[];
	fontRows: FontRow[];
	styleRows: StyleRow[];
	fontFileRows: FontFileRow[];
	assetRows: AssetRow[];
};

/** Props of a block's `Render.svelte`. */
export type BlockRenderProps = {
	block: Block;
	data: BlockData;
	/** Anchor id of the block (only blocks without the shell need it) */
	anchorId?: string;
};

/** Brand data available to the block editor in the admin. */
export type BlockEditorBrand = {
	brandColors: { id: string; name: string; hex: string }[];
	brandFonts: { id: string; name: string }[];
	brandPalettes: { id: string; name: string }[];
};

/** Props of a block's `Editor.svelte`. */
export type BlockEditorProps = BlockEditorBrand & {
	block: { id: string; type: string; config: Record<string, unknown>; anchor: string | null };
	/** Current (unsaved) config */
	cfg: Record<string, unknown>;
	/** Replace the config; the page editor keeps it until the user saves */
	onUpdate: (next: Record<string, unknown>) => void;
};

/** Picker groups, in the order the block picker shows them. */
export const BLOCK_GROUPS = ['text', 'media', 'brand', 'structure', 'files', 'advanced'] as const;
export type BlockGroup = (typeof BLOCK_GROUPS)[number];

/** Helpers the manual audit hands to `audit()`. */
export type BlockAuditContext = {
	/** Report that the block has no content (optionally with a specific message) */
	empty: (message?: string) => void;
	missingAlt: () => void;
	/** Report a referenced file that no longer exists; `what` names it */
	broken: (what: string) => void;
	warn: (code: string, message: string) => void;
	fileExists: (path: string) => boolean;
	str: (value: unknown) => string;
	arr: <T = Record<string, unknown>>(value: unknown) => T[];
	colorRows: { id: string; hex: string; paletteId: string | null }[];
	palettes: { id: string; name: string }[];
	fontRows: { id: string }[];
	assetsFor: (config: Record<string, unknown>, imagesOnly: boolean) => unknown[];
};

/** Helpers the Markdown export hands to `toMarkdown()`. */
export type BlockMarkdownContext = {
	str: (value: unknown) => string;
	arr: <T = Record<string, unknown>>(value: unknown) => T[];
	/** Absolute URL for an uploaded file or link */
	abs: (url: string) => string;
	richContent: (config: Record<string, unknown>) => string;
	table: (headers: string[], rows: string[][]) => string;
	colorsMarkdown: (source: string) => string;
	typographyMarkdown: (fontIds?: string[]) => string;
	colorName: (id: string) => { name: string; hex: string } | undefined;
	fontName: (id: string) => string | undefined;
	assetsFor: (config: Record<string, unknown>, imagesOnly: boolean) => { filename: string; storagePath: string }[];
};

export type BlockDefinition = {
	/** Stored in `manual_blocks.type`; lowercase snake_case, never renamed */
	type: string;
	group: BlockGroup;
	/** Position inside its picker group (lower first) */
	order: number;
	icon: IconComponent;
	/** Public manual view */
	Render: Component<BlockRenderProps>;
	/** Admin editor for the block's own content (heading/intro/anchor are shared) */
	Editor?: Component<BlockEditorProps>;
	/**
	 * Wrap the block in the standard shell (heading, intro, callout, anchor).
	 * Default true; decorative blocks such as the divider opt out.
	 */
	shell?: boolean;
	/** Renders brand data or defaults even with an empty config (landing page shows it) */
	rendersWithoutConfig?: boolean;
	/** Fallback name/description when no `block_type_<type>` message exists */
	label?: Partial<Record<'en' | 'cs', string>>;
	description?: Partial<Record<'en' | 'cs', string>>;
	/** Content checks for the manual audit */
	audit?: (config: Record<string, unknown>, ctx: BlockAuditContext) => void;
	/** Plain Markdown for AI export, llms.txt and the MCP server */
	toMarkdown?: (config: Record<string, unknown>, ctx: BlockMarkdownContext) => string;
};
