import { defineBlock } from '../define';
import { IconFileDownload } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'logo_download',
	group: 'brand',
	order: 10,
	icon: IconFileDownload,
	Render,
});
