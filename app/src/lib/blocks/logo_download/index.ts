import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconFileDownload } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'logo_download',
	group: 'brand',
	order: 10,
	icon: IconFileDownload,
	Render,
	Editor,
	audit(c, { str, arr, empty, broken, fileExists }) {
		const variants = arr<{ url?: string; files?: { url?: string }[] }>(c.variants).filter((v) => str(v.url));
		if (!variants.length) empty(m.audit_no_logo_variant());
		for (const v of variants) {
			if (!fileExists(str(v.url))) broken(m.audit_what_logo_file({ name: str(v.url).split('/').pop() ?? '' }));
			for (const f of v.files ?? []) if (str(f.url) && !fileExists(str(f.url))) broken(m.audit_what_file({ name: str(f.url).split('/').pop() ?? '' }));
		}
	},
	toMarkdown: (c, { str, arr, abs, origin, blockId }) => [
		(c.minSizePx || c.minSizeMm) && `Minimum logo height: ${c.minSizePx ? `${c.minSizePx} px on screens` : ''}${c.minSizePx && c.minSizeMm ? ', ' : ''}${c.minSizeMm ? `${c.minSizeMm} mm in print` : ''}`,
		...arr<{ label?: string; url?: string; background?: string }>(c.variants).filter((v) => str(v.url))
			.map((v) => `- ${str(v.label) || 'Logo'} (${str(v.background) || 'light'} background): ${abs(str(v.url))}`),
		`All versions (ZIP): ${origin}/api/manual/blocks/${blockId}/logo-pack`,
	].filter(Boolean).join('\n'),
});
