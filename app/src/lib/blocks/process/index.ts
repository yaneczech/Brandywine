import { defineBlock } from '../define';
import { IconStairs } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'process',
	group: 'brand',
	order: 140,
	icon: IconStairs,
	Render,
	Editor,
});
