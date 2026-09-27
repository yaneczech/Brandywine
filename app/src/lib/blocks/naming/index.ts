import { defineBlock } from '../define';
import { IconAbc } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'naming',
	group: 'brand',
	order: 110,
	icon: IconAbc,
	Render,
	Editor,
});
