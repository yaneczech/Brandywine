import { defineBlock } from '../define';
import { IconNumbers } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'stats',
	group: 'structure',
	order: 20,
	icon: IconNumbers,
	Render,
});
