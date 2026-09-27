<script lang="ts">
	import * as m from '$lib/paraglide/messages';
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
	} from '$lib/icons';

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

	// Svelte action: contenteditable manages its own DOM — reactive {@html} would
	// reset the caret on every keystroke. So the DOM is written on mount and then
	// only when the value changes from outside (e.g. the block's config arrives
	// after first render) while the field is not being edited.
	function initContent(node: HTMLElement, html: string) {
		node.innerHTML = html;
		return {
			update(next: string) {
				if (document.activeElement !== node && node.innerHTML !== next) node.innerHTML = next;
			}
		};
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
			html: '<p></p>'
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
	<div class="rich-toolbar" aria-label={m.rich_toolbar()}>
		<button type="button" title={m.rich_bold()} aria-label={m.rich_bold()} onclick={() => runCommand('bold')}><IconBold size={15} /></button>
		<button type="button" title={m.rich_italic()} aria-label={m.rich_italic()} onclick={() => runCommand('italic')}><IconItalic size={15} /></button>
		<button type="button" title={m.rich_bullets()} aria-label={m.rich_bullets()} onclick={() => runCommand('insertUnorderedList')}><IconList size={15} /></button>
		<button type="button" title={m.rich_numbers()} aria-label={m.rich_numbers()} onclick={() => runCommand('insertOrderedList')}><IconListNumbers size={15} /></button>
		<span class="toolbar-sep"></span>
		<button type="button" title={m.rich_add_text()} onclick={() => insertItem('text')}><IconPlus size={15} /> {m.rich_text()}</button>
		<button type="button" title={m.rich_add_attention()} onclick={() => insertItem('attention')}><IconExclamationCircle size={15} /> {m.rich_attention()}</button>
		<button type="button" title={m.rich_add_alert()} onclick={() => insertItem('alert')}><IconCancel size={15} /> {m.rich_alert()}</button>
	</div>

	<div class="rich-items">
		{#each items as item, index (item.id)}
			<div class="rich-item" class:callout={item.type !== 'text'} class:is-alert={item.type === 'alert'} class:active={activeIndex === index}>
				{#if item.type !== 'text'}
					<div class="callout-head">
						{#if item.type === 'alert'}
							<IconCancel size={16} stroke={1.9} />
							<span>{m.rich_alert()}</span>
						{:else}
							<IconAlertCircle size={16} stroke={1.9} />
							<span>{m.rich_attention()}</span>
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
				<button type="button" class="remove-item" title={m.rich_remove_part()} aria-label={m.rich_remove_part()} onclick={() => removeItem(index)}>
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
		gap: 8px;
	}
	.rich-toolbar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
		padding: 8px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--color-surface) 92%, transparent);
	}
	.rich-toolbar button {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 30px;
		padding: 4px 8px;
		border: 1px solid transparent;
		border-radius: var(--radius);
		background: transparent;
		color: var(--color-text);
		font: inherit;
		font-size: var(--text-xs);
		cursor: pointer;
	}
	.rich-toolbar button:hover {
		background: var(--color-hover);
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
		gap: 8px;
	}
	.rich-item {
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		box-shadow: var(--shadow-xs);
		transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
	}
	.rich-item:focus-within {
		border-color: var(--color-border-focus);
		box-shadow: var(--focus-ring);
	}
	.rich-item.callout {
		background: color-mix(in srgb, var(--color-accent) 4%, var(--color-surface));
		border-color: color-mix(in srgb, var(--color-accent) 25%, var(--color-border));
	}
	.rich-item.callout.is-alert {
		background: var(--color-danger-subtle);
		border-color: color-mix(in srgb, var(--color-danger) 28%, var(--color-border));
	}
	.callout-head {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 12px 0;
		color: var(--color-accent);
		font-size: var(--text-2xs);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: var(--tracking-eyebrow);
		white-space: nowrap;
	}
	.rich-item.is-alert .callout-head {
		color: var(--color-danger);
	}
	.editable {
		min-height: 96px;
		padding: 12px 12px;
		outline: none;
		color: var(--color-text);
		font-size: var(--text-base);
		line-height: 1.6;
		direction: ltr;
		unicode-bidi: embed;
		text-align: left;
	}
	.rich-item.callout .editable {
		min-height: 58px;
	}
	.editable :global(p) {
		margin: 0 0 12px;
	}
	.editable :global(p:last-child),
	.editable :global(ul:last-child),
	.editable :global(ol:last-child) {
		margin-bottom: 0;
	}
	.editable :global(ul),
	.editable :global(ol) {
		margin: 8px 0 8px 20px;
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
		border-radius: var(--radius);
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
	}
	.remove-item:hover {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
	}
</style>
