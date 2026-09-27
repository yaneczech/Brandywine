// Browser part of the Hello example: custom elements used by the manifest.
// Plain JavaScript here; a Svelte component compiled with
// <svelte:options customElement={{ tag: 'hello-counter', shadow: 'none' }} /> works the same way.

// Banner styles, scoped by class; they use the manual's theme tokens
const style = document.createElement('style');
style.textContent = `
	.hello-banner { padding: 20px 24px; border-left: 1px solid var(--manual-brand); }
	.hello-banner--brand { background: color-mix(in srgb, var(--manual-brand) 8%, transparent); }
	.hello-banner strong { display: block; font-size: var(--text-xl); color: var(--manual-ink); }
	.hello-banner p { margin: 8px 0 0; color: var(--manual-muted); white-space: pre-line; }
	.hello-banner p:empty { display: none; }
`;
document.head.append(style);

// <hello-counter data-config='{"label":"Clicks","start":0}'> — a block
customElements.define('hello-counter', class extends HTMLElement {
	connectedCallback() {
		const config = JSON.parse(this.dataset.config || '{}');
		let count = Number(config.start) || 0;
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'btn btn-secondary';
		const render = () => (button.textContent = `${config.label || 'Clicks'}: ${count}`);
		button.addEventListener('click', () => { count++; render(); });
		render();
		this.replaceChildren(button);
	}
});

// <hello-stats> — an admin page; Brandywine sets `.data` from the server loader
customElements.define('hello-stats', class extends HTMLElement {
	set data(value) {
		this.innerHTML = `
			<p>Assets uploaded since install: <strong>${Number(value?.uploads) || 0}</strong></p>
			<p>Pages saved since install: <strong>${Number(value?.pageSaves) || 0}</strong></p>
			<button type="button" class="btn btn-secondary btn-sm">Refresh</button>`;
		this.querySelector('button').addEventListener('click', async () => {
			this.data = await (await fetch('/api/x/hello/stats')).json();
		});
	}
});
