<script lang="ts">
	import { untrack } from 'svelte';
	import {
		IconAlertCircle,
		IconBold,
		IconCancel,
		IconExclamationCircle,
		IconItalic,
		IconList,
		IconListNumbers,
		IconPlus,
		IconTrash
	} from '@tabler/icons-svelte';

	type RichItemType = 'text' | 'attention' | 'alert';
	type RichItem = { id: string; type: RichItemType; html: string };

	const {
		value,
		legacyMarkdown = '',
		onChange
	}: {
		value?: unknown;
		legacyMarkdown?: string;
		onChange: (items: RichItem[]) => void;
	} = $props();

	// svelte-ignore state_referenced_locally
	let items = $state<RichItem[]>(normalizeItems(value, legacyMarkdown));
	let activeIndex = $state(0);
	let editorRoot = $state<HTMLElement | null>(null);

	// Sync from external value — only when it truly changes from outside.
	// untrack(items) prevents this effect from re-running when user types.
	$effect(() => {
		const next = normalizeItems(value, legacyMarkdown);
		untrack(() => {
			if (JSON.stringify(stripIds(next)) !== JSON.stringify(stripIds(items))) {
				items = next;
			}
		});
	});

	// Svelte action: set innerHTML once on mount, never on update.
	// contenteditable manages its own DOM — reactive {@html} would reset the cursor on every keystroke.
	function initContent(node: HTMLElement, html: string) {
		node.innerHTML = html;
		return { update(_: string) {} };
	}

	function stripIds(list: RichItem[]) {
		return list.map(({ type, html }) => ({ type, html }));
	}

	function itemId(index: number, type: RichItemType) {
		return `${type}-${index}`;
	}

	function normalizeItems(raw: unknown, markdown: string): RichItem[] {
		if (Array.isArray(raw) && raw.length) {
			return raw
				.map((item, index) => {
					const record = item as Record<string, unknown>;
					const rawType: RichItemType =
						record.type === 'attention' || record.type === 'alert' ? record.type : 'text';
					return {
						id: typeof record.id === 'string' ? record.id : itemId(index, rawType),
						type: rawType,
						html: cleanEditorHtml(typeof record.html === 'string' ? record.html : '')
					};
				})
				.filter((item) => item.type !== 'text' || item.html.trim() !== '' || raw.length === 1);
		}
		const html = markdown.trim()
			? markdown
				.split(/\n{2,}/)
				.map((part) => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
				.join('')
			: '<p></p>';
		return [{ id: 'text-0', type: 'text', html }];
	}

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function cleanEditorHtml(value: string) {
		return value
			.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
			.replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
			.replace(/\s+href\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, '')
			.replace(/<(?!\/?(p|br|strong|b|em|i|u|ul|ol|li|h3|h4|a)\b)[^>]+>/gi, '');
	}

	function emit() {
		onChange(items.map((item) => ({ ...item, html: cleanEditorHtml(item.html) })));
	}

	function updateHtml(index: number, html: string) {
		items[index] = { ...items[index], html: cleanEditorHtml(html) };
		items = [...items];
		emit();
	}

	function runCommand(command: string, value?: string) {
		if (typeof document === 'undefined') return;
		document.execCommand(command, false, value);
		emitFromDom();
	}

	function emitFromDom() {
		if (typeof document === 'undefined') return;
		const nodes = editorRoot?.querySelectorAll<HTMLElement>('[data-rich-item]');
		const next = [...items];
		nodes?.forEach((node) => {
			const index = Number(node.dataset.richItem);
			if (Number.isFinite(index) && next[index]) {
				next[index] = { ...next[index], html: cleanEditorHtml(node.innerHTML) };
			}
		});
		items = next;
		emit();
	}

	function insertItem(type: RichItemType) {
		const index = Math.min(Math.max(activeIndex, 0), items.length - 1);
		const item: RichItem = {
			id: `${type}-${Date.now()}`,
			type,
			html: type === 'text' ? '<p></p>' : '<p>Text upozornění...</p>'
		};
		items = [...items.slice(0, index + 1), item, ...items.slice(index + 1)];
		activeIndex = index + 1;
		emit();
	}

	function removeItem(index: number) {
		if (items.length <= 1) {
			items = [{ id: 'text-0', type: 'text', html: '<p></p>' }];
		} else {
			items = items.filter((_, i) => i !== index);
		}
		activeIndex = Math.max(0, Math.min(index, items.length - 1));
		emit();
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const text = event.clipboardData?.getData('text/plain') ?? '';
		if (typeof document !== 'undefined') {
			document.execCommand('insertText', false, text);
			emitFromDom();
		}
	}
</script>

<div class="rich-editor" bind:this={editorRoot}>
	<div class="rich-toolbar" aria-label="Formátování textu">
		<button type="button" title="Tučně" onclick={() => runCommand('bold')}><IconBold size={15} /></button>
		<button type="button" title="Kurzíva" onclick={() => runCommand('italic')}><IconItalic size={15} /></button>
		<button type="button" title="Odrážkový seznam" onclick={() => runCommand('insertUnorderedList')}><IconList size={15} /></button>
		<button type="button" title="Číslovaný seznam" onclick={() => runCommand('insertOrderedList')}><IconListNumbers size={15} /></button>
		<span class="toolbar-sep"></span>
		<button type="button" title="Přidat text" onclick={() => insertItem('text')}><IconPlus size={15} /> Text</button>
		<button type="button" title="Vložit attention box" onclick={() => insertItem('attention')}><IconExclamationCircle size={15} /> Attention</button>
		<button type="button" title="Vložit alert box" onclick={() => insertItem('alert')}><IconCancel size={15} /> Alert</button>
	</div>

	<div class="rich-items">
		{#each items as item, index (item.id)}
			<div class="rich-item" class:callout={item.type !== 'text'} class:alert={item.type === 'alert'} class:active={activeIndex === index}>
				{#if item.type !== 'text'}
					<div class="callout-head">
						{#if item.type === 'alert'}
							<IconCancel size={16} stroke={1.9} />
							<span>Alert box</span>
						{:else}
							<IconAlertCircle size={16} stroke={1.9} />
							<span>Attention box</span>
						{/if}
					</div>
				{/if}
				<div
					class="editable"
					contenteditable="true"
					dir="ltr"
					data-rich-item={index}
					role="textbox"
					aria-multiline="true"
					tabindex="0"
					onfocus={() => (activeIndex = index)}
					oninput={(event) => updateHtml(index, (event.currentTarget as HTMLElement).innerHTML)}
					onpaste={handlePaste}
					use:initContent={item.html}
				></div>
				<button type="button" class="remove-item" title="Smazat část" onclick={() => removeItem(index)}>
					<IconTrash size={14} />
				</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.rich-editor {
		display: flex;
		flex-direction: column;
		gap: .6rem;
	}
	.rich-toolbar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: .3rem;
		flex-wrap: wrap;
		padding: .45rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: color-mix(in srgb, var(--color-surface) 92%, transparent);
	}
	.rich-toolbar button {
		display: inline-flex;
		align-items: center;
		gap: .3rem;
		min-height: 30px;
		padding: .3rem .5rem;
		border: 1px solid transparent;
		border-radius: 6px;
		background: transparent;
		color: var(--color-text);
		font: inherit;
		font-size: .78rem;
		cursor: pointer;
	}
	.rich-toolbar button:hover {
		background: var(--color-surface-raised);
		border-color: var(--color-border);
	}
	.toolbar-sep {
		width: 1px;
		height: 22px;
		background: var(--color-border);
	}
	.rich-items {
		display: flex;
		flex-direction: column;
		gap: .55rem;
	}
	.rich-item {
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface-raised);
	}
	.rich-item.active {
		border-color: var(--brand);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 10%, transparent);
	}
	.rich-item.callout {
		background: color-mix(in srgb, var(--brand) 6%, var(--color-surface-raised));
		border-color: color-mix(in srgb, var(--brand) 25%, var(--color-border));
	}
	.rich-item.callout.alert {
		background: color-mix(in srgb, #ef4444 7%, var(--color-surface-raised));
		border-color: color-mix(in srgb, #ef4444 28%, var(--color-border));
	}
	.callout-head {
		display: flex;
		align-items: center;
		gap: .4rem;
		width: 100%;
		padding: .55rem .7rem 0;
		color: var(--brand);
		font-size: .72rem;
		font-weight: 760;
		text-transform: uppercase;
		letter-spacing: .04em;
		white-space: nowrap;
	}
	.rich-item.alert .callout-head {
		color: #b91c1c;
	}
	.editable {
		min-height: 96px;
		padding: .7rem .8rem;
		outline: none;
		color: var(--color-text);
		font-size: .9rem;
		line-height: 1.6;
		direction: ltr;
		unicode-bidi: embed;
		text-align: left;
	}
	.rich-item.callout .editable {
		min-height: 58px;
	}
	.editable :global(p) {
		margin: 0 0 .65rem;
	}
	.editable :global(p:last-child),
	.editable :global(ul:last-child),
	.editable :global(ol:last-child) {
		margin-bottom: 0;
	}
	.editable :global(ul),
	.editable :global(ol) {
		margin: .4rem 0 .4rem 1.2rem;
		padding: 0;
	}
	.remove-item {
		position: absolute;
		top: .45rem;
		right: .45rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
	}
	.remove-item:hover {
		background: color-mix(in srgb, #ef4444 10%, transparent);
		color: #dc2626;
	}
</style>
