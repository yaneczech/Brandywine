import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconFolders } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'asset_gallery',
	group: 'files',
	order: 10,
	icon: IconFolders,
	Render,
	Editor,
	rendersWithoutConfig: true,
	audit(c, { warn, assetsFor }) {
		if (!assetsFor(c, false).length) warn('no_assets', m.audit_selection_no_files());
	},
	toMarkdown: (c, { assetList }) => assetList(c),
});
