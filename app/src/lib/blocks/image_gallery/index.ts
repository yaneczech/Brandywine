import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconLayoutGrid } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'image_gallery',
	group: 'media',
	order: 30,
	icon: IconLayoutGrid,
	Render,
	Editor,
	audit(c, { str, empty, warn, assetsFor }) {
		if (!str(c.folderId)) empty(m.audit_no_folder());
		else if (!assetsFor(c, true).length) warn('no_assets', m.audit_folder_no_images());
	},
	toMarkdown: (c, { assetList }) => assetList(c, true),
});
