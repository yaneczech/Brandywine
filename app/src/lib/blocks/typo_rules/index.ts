import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconTextSpellcheck } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'typo_rules',
	group: 'brand',
	order: 120,
	icon: IconTextSpellcheck,
	Render,
	Editor,
	audit(c, { arr, empty }) {
		if (!arr<{ rules?: unknown }>(c.languages).some((lang) => arr(lang.rules).length)) empty(m.audit_no_typo_rules());
	},
	toMarkdown: (c, { str, arr, table }) => arr<{ label?: string; lang?: string; rules?: { category?: string; rule?: string; correct?: string; wrong?: string }[] }>(c.languages)
		.map((l) => `**${str(l.label) || str(l.lang)}**\n\n${table(['Category', 'Rule', 'Correct', 'Wrong'], (l.rules ?? []).map((r) => [r.category, r.rule, r.correct, r.wrong]))}`).join('\n\n'),
});
