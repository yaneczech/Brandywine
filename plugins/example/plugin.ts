/**
 * Example plugin — a starting point, not a feature. It shows every extension
 * point: a manual block, an admin page with server data, an API route and
 * event handlers (in plugin.server.ts). Enable it in plugins/plugins.json.
 */
import { definePlugin } from '$lib/plugins/types';
import { defineBlock } from '$lib/blocks/define';
import { IconInfoCircle, IconChartRadar } from '$lib/icons';
import { getLocale } from '$lib/paraglide/runtime';
import NoteRender from './NoteRender.svelte';
import NoteEditor from './NoteEditor.svelte';
import ActivityPage from './ActivityPage.svelte';

export default definePlugin({
	id: 'example',
	name: 'Example plugin',
	version: '1.0.0',
	description: 'Demonstrates blocks, admin pages, API routes and event hooks.',

	blocks: [
		defineBlock({
			type: 'example_note',
			group: 'text',
			order: 90,
			icon: IconInfoCircle,
			Render: NoteRender,
			Editor: NoteEditor,
			label: { en: 'Note (example plugin)', cs: 'Poznámka (ukázkový plugin)' },
			description: { en: 'A short highlighted note', cs: 'Krátká zvýrazněná poznámka' },
			audit(c, { str, empty }) {
				if (!str(c.text)) empty();
			},
			toMarkdown: (c, { str }) => (str(c.text) ? `> Note: ${str(c.text)}` : ''),
		}),
	],

	modules: [
		{
			id: 'activity',
			label: () => (getLocale() === 'cs' ? 'Aktivita' : 'Activity'),
			icon: IconChartRadar,
			group: 'admin',
			order: 90,
			minRole: 'admin',
			pages: { '': ActivityPage },
		},
	],
});
