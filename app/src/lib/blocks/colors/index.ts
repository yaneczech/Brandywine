import { defineBlock } from '../define';
import { IconPalette } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'colors',
	group: 'brand',
	order: 20,
	icon: IconPalette,
	Render,
	rendersWithoutConfig: true,
});
