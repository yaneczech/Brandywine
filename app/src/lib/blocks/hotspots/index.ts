import { defineBlock } from '../define';
import { IconPointer } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'hotspots',
	group: 'media',
	order: 20,
	icon: IconPointer,
	Render,
});
