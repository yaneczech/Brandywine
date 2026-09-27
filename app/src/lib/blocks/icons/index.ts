import { defineBlock } from '../define';
import { IconIcons } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'icons',
	group: 'brand',
	order: 130,
	icon: IconIcons,
	Render,
});
