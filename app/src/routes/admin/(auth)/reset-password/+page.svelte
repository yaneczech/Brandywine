<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { IconInfoCircle, IconArrowRight, IconLock, IconCheck } from '@tabler/icons-svelte';

	const { form, data }: { form: ActionData; data: PageData } = $props();
</script>

<svelte:head><title>Nastavit heslo · Brandywine</title></svelte:head>

<div class="auth-root">
	<!-- Left: brand panel -->
	<div class="brand-panel">
		<div class="brand-panel-inner">
			<div class="brand-logo">
				<img src="/logo.svg" alt="Brandywine" class="logo-mark" />
			</div>
			<div class="brand-copy">
				<h1 class="brand-name">Brandywine</h1>
				<p class="brand-tagline">The brand platform<br />built for design teams.</p>
			</div>
			<div class="brand-meta">
				<span>Open-source · Apache 2.0</span>
			</div>
		</div>
	</div>

	<!-- Right: form -->
	<div class="form-panel">
		<div class="form-inner">

			{#if !data.valid}
				<!-- Invalid / expired token -->
				<div class="form-header">
					<h2>Odkaz je neplatný</h2>
					<p>Tento odkaz pro obnovení hesla vypršel nebo byl již použit.</p>
				</div>
				<a href="/admin/login" class="submit-btn" style="text-decoration:none;justify-content:center">
					Zpět na přihlášení
				</a>
			{:else}
				<!-- Valid token — show password form -->
				<div class="form-header">
					<h2>Nastavit nové heslo</h2>
					<p>Zvolte si nové heslo pro účet <strong>{data.email}</strong>.</p>
				</div>

				{#if form?.error}
					<div class="alert" role="alert">
						<IconInfoCircle size={16} stroke={1.5} />
						{form.error}
					</div>
				{/if}

				<form method="POST" class="form">
					<input type="hidden" name="token" value={data.token} />

					<div class="field">
						<label for="password">Nové heslo</label>
						<div class="input-wrap">
							<IconLock size={16} class="input-icon" />
							<input
								id="password"
								type="password"
								name="password"
								placeholder="Minimálně 8 znaků"
								required
								minlength="8"
								autocomplete="new-password"
							/>
						</div>
					</div>

					<div class="field">
						<label for="confirm">Potvrdit heslo</label>
						<div class="input-wrap">
							<IconLock size={16} class="input-icon" />
							<input
								id="confirm"
								type="password"
								name="confirm"
								placeholder="Zopakujte heslo"
								required
								autocomplete="new-password"
							/>
						</div>
					</div>

					<button type="submit" class="submit-btn">
						<IconCheck size={16} stroke={1.75} /> Uložit heslo a přihlásit se
					</button>
				</form>
			{/if}

			<a href="/admin/login" class="back-link">← Zpět na přihlášení</a>
		</div>
	</div>
</div>

<style>
	.auth-root {
		display: flex;
		min-height: 100vh;
		background: var(--color-bg);
	}

	.brand-panel {
		width: 420px;
		flex-shrink: 0;
		background: #4A1204;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: stretch;
	}
	.brand-panel::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
		pointer-events: none;
	}
	.brand-panel-inner {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		padding: 3rem;
		width: 100%;
	}
	.brand-logo { margin-bottom: auto; }
	.logo-mark {
		height: 64px;
		width: auto;
		filter: brightness(0) invert(1);
		opacity: 0.92;
	}
	.brand-copy { margin-top: auto; margin-bottom: 2rem; }
	.brand-name {
		font-size: 1.125rem;
		font-weight: 700;
		color: rgba(255,255,255,0.5);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: 1rem;
	}
	.brand-tagline {
		font-size: 2rem;
		font-weight: 650;
		line-height: 1.2;
		letter-spacing: -0.03em;
		color: #fff;
	}
	.brand-meta {
		font-size: 0.75rem;
		color: rgba(255,255,255,0.4);
		letter-spacing: 0.03em;
	}

	.form-panel {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
	}
	.form-inner {
		width: 100%;
		max-width: 380px;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.form-header h2 {
		font-size: 1.5rem;
		font-weight: 650;
		letter-spacing: -0.025em;
		color: var(--color-text);
		margin-bottom: 6px;
	}
	.form-header p {
		font-size: 0.9rem;
		color: var(--color-muted);
	}
	.alert {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: #fff5f5;
		border: 1px solid #fecaca;
		border-radius: var(--radius);
		color: var(--color-danger);
		font-size: 0.875rem;
	}
	.form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
	}
	.input-wrap {
		position: relative;
	}
	.input-wrap :global(svg) {
		position: absolute;
		left: 14px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-muted);
		pointer-events: none;
	}
	.input-wrap input {
		width: 100%;
		height: 42px;
		padding: 0 14px 0 40px;
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.9375rem;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
		box-sizing: border-box;
	}
	.input-wrap input::placeholder { color: var(--color-placeholder); }
	.input-wrap input:focus {
		border-color: #4A1204;
		box-shadow: 0 0 0 3px rgba(74,18,4,.10);
	}
	.submit-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		height: 46px;
		margin-top: 0.5rem;
		background: #4A1204;
		color: #fff;
		border: none;
		border-radius: var(--radius);
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
		box-shadow: 0 1px 3px rgba(74,18,4,.3), 0 4px 12px rgba(74,18,4,.15);
		padding: 0 1.25rem;
	}
	.submit-btn:hover {
		filter: brightness(1.1);
		box-shadow: 0 2px 6px rgba(74,18,4,.35), 0 6px 20px rgba(74,18,4,.2);
		transform: translateY(-1px);
	}
	.back-link {
		font-size: 0.8125rem;
		color: var(--color-muted);
		text-decoration: none;
		text-align: center;
	}
	.back-link:hover { color: var(--color-text); }

	@media (max-width: 720px) {
		.auth-root { flex-direction: column; }
		.brand-panel { width: 100%; min-height: 180px; flex-shrink: 0; }
		.brand-panel-inner { padding: 1.75rem; flex-direction: row; align-items: center; gap: 1.5rem; }
		.brand-logo { margin-bottom: 0; }
		.logo-mark { height: 44px; }
		.brand-copy { margin-top: 0; margin-bottom: 0; }
		.brand-tagline { font-size: 1.25rem; }
		.brand-name { margin-bottom: 0.25rem; }
		.brand-meta { display: none; }
		.form-panel { padding: 2rem 1.25rem; }
	}
</style>
