/**
 * Events Brandywine announces after something changed. Plugins subscribe in
 * plugin.server.ts (`on: { 'asset.uploaded': … }`); webhooks receive the same
 * payloads as JSON. Payloads never contain secrets or file contents.
 */
export type BrandywineEvents = {
	'asset.uploaded': { asset: { id: string; filename: string; mime: string; size: number; url: string; folderId: string | null }; userId: string };
	'asset.deleted': { asset: { id: string; filename: string }; userId: string };
	'page.saved': { page: { id: string; title: string; slug: string; parentId: string | null }; created: boolean; userId: string };
	'page.deleted': { page: { id: string; title: string }; userId: string };
	'block.saved': { block: { id: string; pageId: string; type: string }; created: boolean; userId: string };
	'block.deleted': { block: { id: string; pageId: string; type: string }; userId: string };
	'user.signedIn': { user: { id: string; email: string; role: string }; method: 'password' | 'magic-link' };
	'settings.changed': { keys: string[]; userId: string };
};

export type BrandywineEventName = keyof BrandywineEvents;

/** Every event name, in the order the admin lists them */
export const EVENT_NAMES = [
	'asset.uploaded', 'asset.deleted',
	'page.saved', 'page.deleted',
	'block.saved', 'block.deleted',
	'user.signedIn', 'settings.changed',
] as const satisfies readonly BrandywineEventName[];
