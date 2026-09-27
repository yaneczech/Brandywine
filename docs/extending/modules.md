# Adding an admin module

An admin module is a section of the admin with its own sidebar entry — Colours,
Typography, Assets and Users are modules. A module has two parts:

```text
app/src/lib/modules/<id>/index.ts   registration: sidebar entry + access rule
app/src/routes/admin/<id>/          its pages (SvelteKit routes)
```

To add a section without changing the code, write a [plugin](plugins.md)
instead.

The registry (`app/src/lib/modules/index.ts`) picks up every
`modules/*/index.ts` on its own. The admin layout builds the sidebar from it,
and `routes/admin/+layout.server.ts` refuses every path under the module's
`href` to users below its `minRole` — you cannot forget the check.

## 1. Register the module

```ts
// app/src/lib/modules/guidelines/index.ts
import * as m from '$lib/paraglide/messages';
import { IconBook } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'guidelines',
	href: '/admin/guidelines',
	group: 'brand',          // sidebar group: brand, assets, admin
	order: 50,               // position inside the group
	icon: IconBook,
	label: m.admin_guidelines,   // a message function, so it follows the UI language
	minRole: 'editor',       // member | editor | admin (default editor)
});
```

Add the label to `app/src/messages/en.json` and `cs.json`:

```json
"admin_guidelines": "Guidelines"
```

## 2. Add the pages

```svelte
<!-- app/src/routes/admin/guidelines/+page.svelte -->
<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	const { data } = $props();
</script>

<svelte:head><title>{m.admin_guidelines()} · Brandywine</title></svelte:head>

<div class="ap">
	<div class="ap-topbar">
		<div>
			<h1 class="ap-title">{m.admin_guidelines()}</h1>
			<p class="ap-sub">{data.count}</p>
		</div>
	</div>
</div>
```

```ts
// app/src/routes/admin/guidelines/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { count: 0 };
};
```

The admin layout already requires a signed-in user with the module's role. For
a finer rule inside a page, check `locals.user.role` with `hasRole()` from
`$lib/auth/roles`.

## 3. Data and API

- **Tables:** add a schema file to `app/src/lib/db/schema/`, export it from
  `schema/index.ts`, then `npm run db:generate` to create a migration. Prefix
  table names with the module id (`guidelines_…`) to avoid clashes.
- **API endpoints:** put them under `app/src/routes/api/<id>/`. Each handler
  checks the user itself — the admin layout does not cover `/api`:

  ```ts
  import { error, json } from '@sveltejs/kit';
  import { hasRole } from '$lib/auth/roles';

  export const GET = async ({ locals }) => {
  	if (!hasRole(locals.user?.role, 'editor')) error(403, 'Forbidden');
  	return json([]);
  };
  ```

- **Showing data in the manual:** add a [block](blocks.md) that reads it.

## 4. Look and feel

Wrap the page in the admin page layout — `.ap`, `.ap-topbar`, `.ap-title`,
`.ap-sub`, `.ap-actions`, `.ap-content` (defined in `routes/admin/+layout.svelte`).
Use the admin components in `$lib/components/ui` (Modal, ConfirmDialog, Tabs,
Menu, EmptyState, Toaster via `toast`), the tokens in
`app/src/styles/global.css`, and follow [DESIGN.md](../../DESIGN.md).

## 5. Check it

```bash
cd app
npm run check && npm run lint && npm test
```

`tests/unit/admin-modules.test.ts` covers the registry. Sign in as an editor
and as an admin and confirm the sidebar entry and the access rule.
