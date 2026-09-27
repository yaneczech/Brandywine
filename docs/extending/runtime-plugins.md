# Runtime plugins

A runtime plugin is a **.zip file** an administrator uploads in
**Admin → Plugins**. It works as soon as it is switched on — no rebuild, no
restart — and can be updated by uploading a newer version.

Use a runtime plugin to share an extension between installations or to let
people install it without touching the server. For changes that belong to one
installation and need the full app API, a [compiled plugin](plugins.md) is
simpler.

| | Runtime plugin | Compiled plugin |
| --- | --- | --- |
| Installed by | uploading a zip in the admin | placing a folder in `plugins/` |
| Takes effect | immediately | after a rebuild |
| Blocks | fields + HTML template, server render, custom elements | Svelte components |
| Admin pages | custom elements | Svelte components |
| Server code | `server.js`, Node built-ins, `ctx` API | full access to `$lib` |

A runtime plugin can:

- add **manual blocks** whose editor form is generated from a field list;
- render blocks from an **HTML template**, a **server function** or a
  **custom element** (for interactive blocks);
- add **admin pages** built as custom elements;
- add **API routes**, react to **events** and keep data in a small
  **key-value store**.

A complete example without a build step is in
[`docs/examples/runtime-plugin`](../examples/runtime-plugin).

## Package

```text
hello.zip
  manifest.json   required — what the plugin adds
  server.js       optional — event handlers, API, page data, block rendering
  client.js       optional — custom elements for the browser
  public/…        optional — files served at /plugin-assets/<id>/<version>/public/…
```

Zip the folder's contents (`zip -r ../hello.zip .`); a zip that wraps
everything in one folder, as Finder and Explorer make it, works too. Limits:
20 MB, 500 files.

## manifest.json

```json
{
	"id": "hello",
	"name": "Hello",
	"version": "1.0.0",
	"description": "What the plugin does.",
	"blocks": [
		{
			"type": "hello_banner",
			"label": { "en": "Banner", "cs": "Banner" },
			"description": { "en": "Headline on a tinted strip" },
			"group": "text",
			"order": 90,
			"icon": "IconInfoCircle",
			"fields": [
				{ "key": "title", "type": "text", "label": { "en": "Title" }, "required": true },
				{ "key": "tone", "type": "select", "label": { "en": "Tone" }, "default": "brand",
					"options": [{ "value": "brand", "label": "Brand" }, { "value": "muted", "label": "Muted" }] }
			],
			"template": "<div class=\"hello-banner hello-banner--{{tone}}\">{{title}}</div>"
		}
	],
	"modules": [
		{ "id": "stats", "label": { "en": "Hello stats" }, "group": "admin", "minRole": "admin", "element": "hello-stats" }
	]
}
```

- `id`: lowercase letters, digits and dashes; it names the plugin everywhere.
- `version`: `major.minor.patch`. Uploading the same `id` again updates the
  plugin and keeps it switched on.
- Labels are text or `{ "en": "…", "cs": "…" }`; English is the fallback.

### Blocks

| Key | Meaning |
| --- | --- |
| `type` | Must start with the plugin id: `hello` → `hello_…` (dashes become `_`). |
| `group`, `order` | Place in the block picker: `text`, `media`, `brand`, `structure`, `files`, `advanced`. |
| `icon` | An icon name from `app/src/lib/icons` (e.g. `IconInfoCircle`); a puzzle piece otherwise. |
| `fields` | The editor form. Types: `text`, `textarea`, `number`, `boolean`, `select` (with `options`), `color`, `url`, `image` (asset picker). `required` fields make the manual audit report an empty block. |
| `template` | HTML with `{{key}}` placeholders; values are HTML-escaped. |
| `element` | A custom element that renders the block, for interactive blocks. It receives the config as JSON in `data-config`. |
| `editorElement` | A custom element that replaces the generated form: set its `config` property, it emits `change` events with the new config in `detail`. |
| `rendersWithoutConfig` | Show the block on the landing page even before it is filled in. |

A block is rendered on the server, in this order: `render` in server.js, the
`template`, the `element`. Heading, intro, callout and anchor are added around
every block by Brandywine, as for built-in blocks.

### Admin pages

Each module adds a sidebar entry and a page at `/admin/x/<plugin>/<module>`.
Brandywine draws the page title and puts your `element` below it; the element
receives the data from `loaders[<module>]` in server.js as its `data`
property. `minRole` (`member`, `editor`, `admin`; default `editor`) is enforced
for the page.

## server.js

Plain ESM loaded by Node. It may import Node built-ins (`node:crypto`…) but
**no npm packages** — bundle what you need into the file. Everything
Brandywine offers comes through `ctx`.

```js
export default {
	// Brandywine events: asset.uploaded, asset.deleted, page.saved, page.deleted,
	// block.saved, block.deleted, user.signedIn, settings.changed
	on: {
		'asset.uploaded': async (payload, ctx) => {
			await ctx.storage.set('lastUpload', payload.asset.filename);
		},
	},

	// /api/x/hello/<path> — signed-in editors and admins only.
	// Return a Response or any JSON value.
	api: {
		stats: {
			GET: async (request, ctx) => ({ last: await ctx.storage.get('lastUpload') }),
		},
	},

	// Data for admin pages, by module id
	loaders: {
		stats: async (ctx) => ({ last: await ctx.storage.get('lastUpload') }),
	},

	// Server-side HTML of a block (overrides the manifest template)
	render: {
		hello_banner: (config, ctx) => `<div class="hello-banner">${escape(config.title)}</div>`,
	},

	// Markdown of a block for the AI export (default: the field values)
	toMarkdown: {
		hello_banner: (config) => `**${config.title}**`,
	},
};
```

`render` output is inserted as HTML: escape the values yourself.

### ctx

| Member | |
| --- | --- |
| `ctx.plugin` | `{ id, version }` |
| `ctx.user` | the signed-in user `{ id, email, role }` for API routes and page loaders, otherwise `null` |
| `ctx.storage` | `get(key)`, `set(key, value)`, `delete(key)`, `list()` — JSON values, private to the plugin, kept when the plugin is removed |
| `ctx.log(...)` | writes to the server log, prefixed with the plugin id |

Errors thrown by event handlers and block rendering are logged and never
break the page or the change that triggered them.

## client.js

Loaded as a module on every page of the manual and the admin while the plugin
is on. Define the custom elements the manifest names:

```js
customElements.define('hello-stats', class extends HTMLElement {
	set data(value) {
		this.textContent = `Last upload: ${value?.last ?? '—'}`;
	}
});
```

Use light DOM (no shadow root) to inherit the manual's and admin's styles and
tokens (`--manual-ink`, `--manual-brand`, `.btn`…).

### Svelte components as custom elements

Write components in Svelte and compile them to one `client.js` with Vite in
your plugin's own project:

```svelte
<!-- src/HelloStats.svelte -->
<svelte:options customElement={{ tag: 'hello-stats', shadow: 'none' }} />
<script>
	let { data } = $props();
</script>
<p>Last upload: {data?.last ?? '—'}</p>
```

```js
// vite.config.js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ compilerOptions: { customElement: true } })],
	build: {
		lib: { entry: 'src/client.js', formats: ['es'], fileName: () => 'client.js' },
		outDir: 'dist',
	},
});
```

```js
// src/client.js
import './HelloStats.svelte';
```

The Svelte runtime is bundled into `client.js`, so the plugin does not depend
on the Svelte version of your Brandywine installation. Copy `manifest.json`
and `server.js` next to `dist/client.js` and zip it.

## Security

- A runtime plugin runs its own code on the server with full access to the
  data. Only administrators can install plugins; install plugins from authors
  you trust.
- `PLUGIN_INSTALLS=disabled` in `.env` removes uploading and updating from
  the admin (installed plugins can still be switched on and off).
- Only `client.js` and files under `public/` are served to browsers; the
  manifest and `server.js` are not.
- Packages are unpacked into `RUNTIME_PLUGINS_DIR` (a Docker volume, included
  in `./brandywine backup`). Paths leaving the package are rejected.

## Remove and disable

Switching a plugin off hides its blocks (they show a placeholder), pages and
routes immediately. Removing it deletes its files; its stored data and the
blocks on your pages stay, so installing it again restores everything.
