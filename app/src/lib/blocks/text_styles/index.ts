import { defineBlock } from '../define';
import { IconLetterCase } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'text_styles',
	group: 'brand',
	order: 70,
	icon: IconLetterCase,
	Render,
	rendersWithoutConfig: true,
});
