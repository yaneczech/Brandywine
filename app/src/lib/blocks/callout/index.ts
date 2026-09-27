import { defineBlock } from '../define';
import { IconInfoCircle } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'callout',
	group: 'text',
	order: 40,
	icon: IconInfoCircle,
	Render,
	Editor,
});
