import { defineBlock } from '../define';
import { IconLayoutGrid } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'image_gallery',
	group: 'media',
	order: 30,
	icon: IconLayoutGrid,
	Render,
});
