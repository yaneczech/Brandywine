import { defineBlock } from '../define';
import { IconContrast } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'contrast_checker',
	group: 'brand',
	order: 40,
	icon: IconContrast,
	Render,
	rendersWithoutConfig: true,
});
