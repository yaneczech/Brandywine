import { defineBlock } from '../define';
import { IconCode } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'code',
	group: 'advanced',
	order: 20,
	icon: IconCode,
	Render,
});
