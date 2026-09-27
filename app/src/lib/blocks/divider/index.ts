import { defineBlock } from '../define';
import { IconSeparator } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'divider',
	group: 'structure',
	order: 50,
	icon: IconSeparator,
	Render,
	Editor,
	shell: false,
	rendersWithoutConfig: true,
});
