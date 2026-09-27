import { defineBlock } from '../define';
import { IconBadge } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'logo_spec',
	group: 'brand',
	order: 80,
	icon: IconBadge,
	Render,
	Editor,
});
