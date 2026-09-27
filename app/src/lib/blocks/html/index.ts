import { defineBlock } from '../define';
import { IconBrackets } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'html',
	group: 'advanced',
	order: 10,
	icon: IconBrackets,
	Render,
});
