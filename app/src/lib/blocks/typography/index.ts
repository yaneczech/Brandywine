import { defineBlock } from '../define';
import { IconTypography } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'typography',
	group: 'brand',
	order: 50,
	icon: IconTypography,
	Render,
	rendersWithoutConfig: true,
});
