import { defineBlock } from '../define';
import { IconPlayerPlay } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'embed',
	group: 'media',
	order: 60,
	icon: IconPlayerPlay,
	Render,
});
