import { defineBlock } from '../define';
import { IconGridDots } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'grid',
	group: 'brand',
	order: 90,
	icon: IconGridDots,
	Render,
	Editor,
	rendersWithoutConfig: true,
});
