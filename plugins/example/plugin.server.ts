/**
 * Server part of the example plugin: remembers the last events in memory,
 * serves them to the Activity page and through /api/x/example/activity.
 */
import { json } from '$lib/plugins/http';
import { definePluginServer } from '$lib/plugins/types';
import type { BrandywineEventName } from '$lib/events';

type Entry = { event: BrandywineEventName; at: string; summary: string };
const recent: Entry[] = [];

function remember(event: BrandywineEventName, summary: string) {
	recent.unshift({ event, at: new Date().toISOString(), summary });
	recent.length = Math.min(recent.length, 50);
}

export default definePluginServer({
	id: 'example',

	on: {
		'asset.uploaded': ({ asset }) => remember('asset.uploaded', asset.filename),
		'asset.deleted': ({ asset }) => remember('asset.deleted', asset.filename),
		'page.saved': ({ page, created }) => remember('page.saved', `${page.title}${created ? ' (new)' : ''}`),
		'block.saved': ({ block }) => remember('block.saved', block.type),
		'user.signedIn': ({ user }) => remember('user.signedIn', user.email),
		'settings.changed': ({ keys }) => remember('settings.changed', keys.join(', ')),
	},

	loaders: {
		activity: {
			'': () => ({ entries: recent }),
		},
	},

	api: {
		activity: {
			GET: () => json(recent),
		},
	},
});
