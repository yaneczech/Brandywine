import { defineBlock } from '../define';
import { IconGridDots } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'grid',
	group: 'brand',
	order: 90,
	icon: IconGridDots,
	Render,
	rendersWithoutConfig: true,
});
