import { defineBlock } from '../define';
import { IconQuote } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'quote',
	group: 'text',
	order: 30,
	icon: IconQuote,
	Render,
	Editor,
});
