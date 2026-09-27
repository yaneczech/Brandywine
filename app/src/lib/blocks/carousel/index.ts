import { defineBlock } from '../define';
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
});
