import { defineBlock } from '../define';
import { IconArrowsHorizontal } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'before_after',
	group: 'media',
	order: 50,
	icon: IconArrowsHorizontal,
	Render,
});
