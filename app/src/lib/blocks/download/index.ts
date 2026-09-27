import { defineBlock } from '../define';
import { IconDownload } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'download',
	group: 'files',
	order: 20,
	icon: IconDownload,
	Render,
	Editor,
	rendersWithoutConfig: true,
});
