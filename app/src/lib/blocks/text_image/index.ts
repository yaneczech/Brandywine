import { defineBlock } from '../define';
import { IconLayoutColumns } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'text_image',
	group: 'text',
	order: 20,
	icon: IconLayoutColumns,
	Render,
	Editor,
});
