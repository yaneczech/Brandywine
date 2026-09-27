import { defineBlock } from '../define';
import { IconDownload } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'download',
	group: 'files',
	order: 20,
	icon: IconDownload,
	Render,
	rendersWithoutConfig: true,
});
