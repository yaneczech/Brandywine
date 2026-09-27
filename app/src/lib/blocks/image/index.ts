import { defineBlock } from '../define';
import { IconPhoto } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'image',
	group: 'media',
	order: 10,
	icon: IconPhoto,
	Render,
	Editor,
});
