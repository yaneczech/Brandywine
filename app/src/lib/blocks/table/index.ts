import { defineBlock } from '../define';
import { IconTable } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'table',
	group: 'structure',
	order: 30,
	icon: IconTable,
	Render,
	Editor,
	audit(c, { arr, empty }) {
		if (!arr(c.headers).length && !arr(c.rows).length) empty();
	},
	toMarkdown: (c, { arr, table }) => table(arr<string>(c.headers), arr<string[]>(c.rows)),
});
