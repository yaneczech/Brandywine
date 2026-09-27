import { defineBlock } from '../define';
import { IconLayoutColumns } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'text_image',
	group: 'text',
	order: 20,
	icon: IconLayoutColumns,
	Render,
});
