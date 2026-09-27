import { defineBlock } from '../define';
import { IconLetterCase } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'text_styles',
	group: 'brand',
	order: 70,
	icon: IconLetterCase,
	Render,
	Editor,
	rendersWithoutConfig: true,
});
