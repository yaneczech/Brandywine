import { defineBlock } from '../define';
import { IconAlignLeft } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'rich_text',
	group: 'text',
	order: 10,
	icon: IconAlignLeft,
	Render,
});
