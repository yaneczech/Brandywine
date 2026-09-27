import { defineBlock } from '../define';
import { IconTypography } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'typography',
	group: 'brand',
	order: 50,
	icon: IconTypography,
	Render,
	Editor,
	rendersWithoutConfig: true,
});
