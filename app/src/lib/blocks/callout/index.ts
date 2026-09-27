import { defineBlock } from '../define';
import { IconInfoCircle } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'callout',
	group: 'text',
	order: 40,
	icon: IconInfoCircle,
	Render,
});
