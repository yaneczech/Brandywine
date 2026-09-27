import { defineBlock } from '../define';
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
});
