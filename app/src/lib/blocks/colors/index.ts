import { defineBlock } from '../define';
import { IconPalette } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'colors',
	group: 'brand',
	order: 20,
	icon: IconPalette,
	Render,
	Editor,
	rendersWithoutConfig: true,
});
