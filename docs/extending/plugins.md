# Plugins

Brandywine has two kinds of plugins:

- **Compiled plugins** (this page) — a folder in `plugins/`, compiled into the
  app; full access to the app's code, applied by a rebuild.
- **[Runtime plugins](runtime-plugins.md)** — a zip uploaded in
  Admin → Plugins; work immediately, no rebuild.

A compiled plugin extends a Brandywine installation without changing its code. Plugins
live in the installation's `plugins/` folder (next to `app/`), one folder per
plugin, and are switched on in `plugins/plugins.json`. They are compiled into
the app, so **enabling, disabling or changing a plugin needs a rebuild**:
`./brandywine update` in production, a dev-server restart in development.

A plugin can:

- add **manual blocks** — the same contract as built-in blocks ([Blocks](blocks.md));
- add **admin sections** with their own pages, served under `/admin/x/<plugin>/<module>`;
- add **API routes** under `/api/x/<plugin>/<path>`;
- **react to events** — an asset uploaded, a page saved, a user signed in…

`plugins/example/` shows all four. Copy it to start your own.

```text
plugins/
  plugins.json            { "enabled": ["example", "my-plugin"] }
  my-plugin/
    plugin.ts             client-safe: blocks, admin page components
    plugin.server.ts      server-only: event handlers, page data, API routes
    *.svelte              components the plugin uses
```

The folder name is the plugin id: lowercase letters, digits and dashes. Both
entry files are optional.

## plugin.ts

```ts
import { definePlugin } from '$lib/plugins/types';
import { defineBlock } from '$lib/blocks/define';
import { IconInfoCircle, IconChartRadar } from '$lib/icons';
import NoteRender from './NoteRender.svelte';
import ReportPage from './ReportPage.svelte';

export default definePlugin({
	id: 'my-plugin',
	name: 'My plugin',
	version: '1.0.0',

	blocks: [
		defineBlock({
			type: 'my_plugin_note',        // prefix block types with the plugin id
			group: 'text', order: 90,
			icon: IconInfoCircle,
			Render: NoteRender,
			label: { en: 'Note', cs: 'Poznámka' },
		}),
	],

	modules: [
		{
			id: 'report',                  // → /admin/x/my-plugin/report
			label: () => 'Report',
			icon: IconChartRadar,
			group: 'admin', order: 90,
			minRole: 'admin',              // member | editor | admin (default editor)
			pages: { '': ReportPage },     // '' = start page; 'settings' → …/report/settings
		},
	],
});
```

Admin pages receive `data` from the matching server loader. Wrap them in the
admin page layout (`.ap`, `.ap-topbar`, `.ap-title`, `.ap-content`) and follow
[DESIGN.md](../../DESIGN.md). The admin enforces each module's `minRole` for
every page under it.

## plugin.server.ts

```ts
import { json } from '$lib/plugins/http';
import { definePluginServer } from '$lib/plugins/types';

export default definePluginServer({
	id: 'my-plugin',

	// React to events. Handlers run after the change is saved; errors are
	// logged and never reach the user.
	on: {
		'asset.uploaded': async ({ asset, userId }) => {
			console.log(`${userId} uploaded ${asset.filename}`);
		},
	},

	// Data for admin pages: loaders[moduleId][subPath]
	loaders: {
		report: {
			'': async (event) => ({ total: 42 }),
		},
	},

	// /api/x/my-plugin/<path>; only signed-in editors and admins get here
	api: {
		stats: {
			GET: () => json({ total: 42 }),
		},
	},
});
```

### Events

| Event | Payload |
| --- | --- |
| `asset.uploaded` | `asset { id, filename, mime, size, url, folderId }`, `userId` |
| `asset.deleted` | `asset { id, filename }`, `userId` |
| `page.saved` | `page { id, title, slug, parentId }`, `created`, `userId` |
| `page.deleted` | `page { id, title }`, `userId` |
| `block.saved` | `block { id, pageId, type }`, `created`, `userId` |
| `block.deleted` | `block { id, pageId, type }`, `userId` |
| `user.signedIn` | `user { id, email, role }`, `method` (`password` / `magic-link`) |
| `settings.changed` | `keys` (names of the changed settings), `userId` |

The types are in `app/src/lib/events.ts`. Payloads never contain secrets or
file contents; load what you need with the ids.

## Rules

- **Imports:** plugins live outside `app/` and have no `node_modules` of their
  own. Import only from `$lib/…` and `svelte`. For HTTP responses use
  `$lib/plugins/http` (`json`, `text`, `error`, `redirect`), not
  `@sveltejs/kit`.
- Import blocks from `$lib/blocks/define`, `$lib/blocks/types` and
  `$lib/blocks/_shared/…` — never `$lib/blocks` or `$lib/modules` themselves
  (those registries load your plugin).
- Keep server code in `plugin.server.ts`; `plugin.ts` is also sent to the
  browser.
- Prefix block types and database tables with the plugin id so they never
  clash with Brandywine or other plugins. Blocks stay in the database when a
  plugin is disabled and show as a placeholder until it is enabled again.
- Plugins run with full server access. Install only plugins you trust.

## Check it

```bash
cd app
npm run check     # type-checks plugins together with the app
npm test
```

Enable the plugin in `plugins/plugins.json`, restart `npm run dev`, then open
its admin page, add its blocks to a page and trigger its events.

## Webhooks

For integrations that live elsewhere (Slack, Zapier, Make, your own service)
you usually do not need a plugin: **Admin → Settings → Webhooks** sends the same
events as signed HTTP `POST` requests.

```http
POST /your-endpoint
Content-Type: application/json
X-Brandywine-Event: asset.uploaded
X-Brandywine-Signature: sha256=<hex HMAC-SHA256 of the raw body with the webhook secret>

{ "id": "…", "event": "asset.uploaded", "createdAt": "2026-09-27T10:00:00.000Z", "data": { … } }
```

Verify the signature before trusting a request, for example in Node:

```js
import { createHmac, timingSafeEqual } from 'node:crypto';
const expected = 'sha256=' + createHmac('sha256', SECRET).update(rawBody).digest('hex');
const valid = timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
```

Deliveries time out after 5 seconds, do not follow redirects and are not
retried; the last result is shown next to each webhook. "Send test" delivers a
`ping` event.
