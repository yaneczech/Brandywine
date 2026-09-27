import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconSlideshow } from '$lib/icons';
import Editor from '../image_gallery/Editor.svelte';
import Render from '../image_gallery/Render.svelte';

export default defineBlock({
	type: 'carousel',
	group: 'media',
	order: 40,
	icon: IconSlideshow,
	Render,
	Editor,
	audit(c, { str, empty, warn, assetsFor }) {
		if (!str(c.folderId)) empty(m.audit_no_folder());
		else if (!assetsFor(c, true).length) warn('no_assets', m.audit_folder_no_images());
	},
	toMarkdown: (c, { assetList }) => assetList(c, true),
});
