import { defineBlock } from '../define';
import { IconContrast } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'contrast_checker',
	group: 'brand',
	order: 40,
	icon: IconContrast,
	Render,
	Editor,
	rendersWithoutConfig: true,
});
