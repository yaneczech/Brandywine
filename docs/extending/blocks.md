# Adding a manual block

A block is one kind of content in the brand manual — rich text, a colour
palette, a logo specification. Every block type lives in its own folder in
`app/src/lib/blocks/` and is discovered automatically: **adding a block means
adding a folder.** Nothing else needs to change.

```text
app/src/lib/blocks/
  quote/
    index.ts        definition: type, picker group, icon, audit, export
    Render.svelte   how the block looks in the public manual
    Editor.svelte   the admin form for the block's content (optional)
  _shared/          helpers used by several blocks
  index.ts          the registry (reads every */index.ts)
  types.ts          BlockDefinition and friends
```

## 1. The definition

`index.ts` default-exports `defineBlock({...})`:

```ts
import { IconQuote } from '$lib/icons';
import { defineBlock } from '../define';
import Render from './Render.svelte';
import Editor from './Editor.svelte';

export default defineBlock({
	type: 'pull_quote',          // stored in manual_blocks.type — never rename it
	group: 'text',               // picker group: text, media, brand, structure, files, advanced
	order: 35,                   // position inside the group
	icon: IconQuote,
	Render,
	Editor,
	label: { en: 'Pull quote', cs: 'Vytažená citace' },
	description: { en: 'A short quote set large', cs: 'Krátká citace velkým písmem' },

	// Manual audit: report missing content
	audit(c, { str, empty }) {
		if (!str(c.text)) empty();
	},

	// Markdown for the AI export, llms.txt and the MCP server
	toMarkdown: (c, { str }) => (str(c.text) ? `> ${str(c.text)}` : ''),
});
```

| Field | Required | Meaning |
| --- | --- | --- |
| `type` | yes | Unique, lowercase `snake_case`. It is stored with every block, so treat it as permanent. |
| `group`, `order` | yes | Where the block appears in the block picker. |
| `icon` | yes | Any icon from `$lib/icons` (add new ones to `app/scripts/icon-map.json` and run `node scripts/generate-icons.mjs`). |
| `Render` | yes | Public view. |
| `Editor` | no | Admin form. Without one, editors get a raw JSON field. |
| `shell` | no | `false` skips the standard heading/intro/callout wrapper (the divider does this). |
| `rendersWithoutConfig` | no | `true` when the block shows brand data even before it is configured (colours, typography…), so it appears on the landing page right away. |
| `label`, `description` | no | Names in the picker. Messages `block_type_<type>` / `block_desc_<type>` in `src/messages/*.json` take precedence. |
| `audit` | no | Called by the manual audit with helpers: `empty()`, `missingAlt()`, `broken(what)`, `warn(code, message)`, `fileExists()`, `assetsFor()`, brand data. |
| `toMarkdown` | no | Called by the Markdown export with helpers: `str`, `arr`, `abs(url)`, `table()`, `richContent()`, `colorsMarkdown()`, `typographyMarkdown()`, brand data. |

## 2. The public view

`Render.svelte` receives the block and the brand data of the page:

```svelte
<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configString } from '../_shared/config';

	const { block }: BlockRenderProps = $props();
	const text = $derived(configString(block.config, 'text'));
</script>

{#if text}
	<blockquote class="pull-quote">{text}</blockquote>
{/if}

<style>
	.pull-quote {
		margin: 0;
		font-size: var(--text-2xl);
		line-height: 1.25;
		color: var(--manual-ink);
	}
</style>
```

- The standard shell (heading, intro, callout, anchor link, chapter number) is
  added around your component — render only the block's own content.
- `data` holds `colorRows`, `paletteRows`, `fontRows`, `styleRows`,
  `fontFileRows` and `assetRows` for blocks that show brand data.
- Use the manual tokens (`--manual-ink`, `--manual-muted`, `--manual-radius`,
  `--manual-flow-gap`…) so the block follows each brand's theme, and follow
  [DESIGN.md](../../DESIGN.md).
- Visitor-facing UI text (buttons, empty states) comes from
  `useManualStrings()` in `$lib/manual/ui-strings`, which follows the manual's
  language.
- Helpers in `_shared/`: `assets.ts` (upload URLs, folder/tag selection),
  `color.ts` (conversions, WCAG contrast), `content.ts` (sanitised rich text),
  `links.ts`, `config.ts`, `clipboard.ts`, `BrandFontFaces.svelte`.
  `_shared/block-styles.css` holds styles several blocks share (`.prose`,
  `.block-table`, `.link-card`…).

## 3. The editor

`Editor.svelte` edits `cfg` and hands every change to `onUpdate`; the page
editor keeps it until the user presses Save. It is remounted for each block, so
local state can start from `cfg`.

```svelte
<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_quote()}</span>
		<textarea rows={3} value={str('text')} oninput={(e) => setStr(e, 'text')}></textarea>
	</label>
</div>
```

- `configFields` gives typed reads (`str`, `num`, `bool`) and setters (`set`,
  `setStr`, `setNum`, `setBool`); `configArray` and `moveItem` help with lists.
- Shared form classes — `.fields`, `.fields-row`, `.field`, `.list-editor`,
  `.btn-add`, `.btn-ghost`… — come from `_shared/editor-styles.css`.
- Ready-made fields: `ImageField` and `AssetPickerModal`
  (`$lib/components/admin`), `FolderField` (`_shared`), `RichContentEditor`.
- Heading, intro, callout and anchor are edited by the page editor for every
  block; do not add them to your form.
- Admin copy goes into `src/messages/en.json` and `cs.json`.

## 4. Check it

```bash
cd app
npm run check && npm run lint && npm test
```

`tests/unit/block-registry.test.ts` fails when a definition is incomplete, a
type is duplicated or a block without `toMarkdown` sneaks in. Then open a page
in the admin, add the block from the picker, fill it in, save, and view the
page in the manual in light and dark mode and on a phone-sized screen.

## Changing an existing block

The block's `config` is stored as JSON in existing manuals. When you rename or
restructure a config field, keep reading the old shape (see how `rich_text`
still reads the legacy `markdown` field) or ship a migration that rewrites the
stored configs.
