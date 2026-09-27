import { defineBlock } from '../define';
import { IconSlideshow } from '$lib/icons';
import Render from '../image_gallery/Render.svelte';

export default defineBlock({
	type: 'carousel',
	group: 'media',
	order: 40,
	icon: IconSlideshow,
	Render,
});
