import { defineBlock } from '../define';
import { IconCards } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'cards',
	group: 'structure',
	order: 10,
	icon: IconCards,
	Render,
});
