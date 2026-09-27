import { defineBlock } from '../define';
import { IconThumbUp } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'do_dont',
	group: 'brand',
	order: 100,
	icon: IconThumbUp,
	Render,
});
