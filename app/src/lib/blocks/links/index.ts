import { defineBlock } from '../define';
import { IconLink } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'links',
	group: 'structure',
	order: 40,
	icon: IconLink,
	Render,
});
