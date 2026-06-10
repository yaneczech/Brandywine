<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import { IconInfoCircle, IconArrowRight, IconCheck } from '@tabler/icons-svelte';
	const { form, data }: { form: ActionData; data: PageData } = $props();

	const systemName = data.brand?.systemName ?? 'Brandywine';
	const logoSrc    = data.brand?.logoPath ?? '/logo.svg';
	const primary    = data.brand?.primaryColor ?? '#4A1204';

	// Forgot-password inline form
	let showForgot   = $state(false);
	let forgotEmail  = $state('');
	let forgotSent   = $state(false);
	let forgotLoading = $state(false);
	let forgotError  = $state('');

	async function sendReset() {
		if (!forgotEmail.trim()) return;
		forgotLoading = true;
		forgotError = '';
		try {
			const r = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() })
			});
			if (r.ok) {
				forgotSent = true;
			} else {
				forgotError = 'Nepodařilo se odeslat email. Zkuste to znovu.';
			}
		} catch {
			forgotError = 'Chyba sítě. Zkuste to znovu.';
		} finally {
			forgotLoading = false;
		}
	}

	function backToLogin() {
		showForgot = false;
		forgotSent = false;
		forgotEmail = '';
		forgotError = '';
	}
</script>

<svelte:head><title>{m.auth_login()} · {systemName}</title></svelte:head>

<div class="auth-root" style="--brand:{primary}; --brand-light:{primary}">
	<!-- Left: brand panel -->
	<div class="brand-panel">
		<div class="brand-panel-inner">
			<div class="brand-logo">
				<img src={logoSrc} alt={systemName} class="logo-mark" />
			</div>
			<div class="brand-copy">
				<h1 class="brand-name">{systemName}</h1>
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

			{#if !showForgot}
				<!-- ── Login form ── -->
				<div class="form-header">
					<h2>{m.auth_welcome_back()}</h2>
					<p>{m.auth_sign_in_sub({ name: systemName })}</p>
				</div>

				{#if form?.error}
					<div class="alert" role="alert">
						<IconInfoCircle size={16} stroke={1.5} />
						{form.error}
					</div>
				{/if}

				<form method="POST" class="form">
					<input type="hidden" name="redirectTo" value={data.redirectTo} />

					<div class="field">
						<label for="email">{m.auth_email()}</label>
						<input
							id="email"
							type="email"
							name="email"
							placeholder="jan@studio.cz"
							required
							autocomplete="email"
						/>
					</div>

					<div class="field">
						<div class="field-label-row">
							<label for="password">{m.auth_password()}</label>
							<button type="button" class="forgot-link" onclick={() => showForgot = true}>
								Zapomněli jste heslo?
							</button>
						</div>
						<input
							id="password"
							type="password"
							name="password"
							required
							autocomplete="current-password"
						/>
					</div>

					<button type="submit" class="submit-btn">
						{m.auth_login()}
						<IconArrowRight size={16} stroke={1.75} />
					</button>
				</form>

			{:else}
				<!-- ── Forgot password form ── -->
				<div class="form-header">
					<h2>Zapomenuté heslo</h2>
					<p>Zadejte svůj email a my vám pošleme odkaz pro nastavení nového hesla.</p>
				</div>

				{#if forgotSent}
					<!-- Success state -->
					<div class="success-box">
						<div class="success-icon"><IconCheck size={20} stroke={2} /></div>
						<p>
							Pokud je email <strong>{forgotEmail}</strong> registrován,
							pošleme vám odkaz pro obnovení hesla. Zkontrolujte svou schránku (i spam).
						</p>
					</div>
				{:else}
					{#if forgotError}
						<div class="alert" role="alert">
							<IconInfoCircle size={16} stroke={1.5} />
							{forgotError}
						</div>
					{/if}

					<div class="form">
						<div class="field">
							<label for="forgot-email">{m.auth_email()}</label>
							<input
								id="forgot-email"
								type="email"
								bind:value={forgotEmail}
								placeholder="jan@studio.cz"
								autocomplete="email"
								onkeydown={e => e.key === 'Enter' && sendReset()}
							/>
						</div>
						<button class="submit-btn" onclick={sendReset} disabled={forgotLoading || !forgotEmail.trim()}>
							{forgotLoading ? 'Odesílám…' : 'Odeslat odkaz'}
							{#if !forgotLoading}<IconArrowRight size={16} stroke={1.75} />{/if}
						</button>
					</div>
				{/if}

				<button type="button" class="back-link" onclick={backToLogin}>
					← Zpět na přihlášení
				</button>
			{/if}

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
		background: var(--brand);
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

	.success-box {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		padding: 14px 16px;
		background: color-mix(in srgb, var(--brand) 6%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--brand) 20%, transparent);
		border-radius: var(--radius);
		font-size: 0.875rem;
		color: var(--color-text);
		line-height: 1.5;
	}
	.success-icon {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--brand);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 2px;
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
	.field-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.field label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
	}
	.field input {
		height: 42px;
		padding: 0 14px;
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.9375rem;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
		width: 100%;
		box-sizing: border-box;
	}
	.field input::placeholder { color: var(--color-placeholder); }
	.field input:focus {
		border-color: var(--brand);
		box-shadow: 0 0 0 3px rgba(74,18,4,.10);
	}

	.forgot-link {
		font-size: 0.75rem;
		color: var(--color-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-decoration: none;
		transition: color 0.15s;
	}
	.forgot-link:hover { color: var(--brand); }

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 100%;
		height: 46px;
		margin-top: 0.5rem;
		background: var(--brand);
		color: #fff;
		border: none;
		border-radius: var(--radius);
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
		box-shadow: 0 1px 3px rgba(74,18,4,.3), 0 4px 12px rgba(74,18,4,.15);
	}
	.submit-btn:hover:not(:disabled) {
		background: var(--brand-light);
		box-shadow: 0 2px 6px rgba(74,18,4,.35), 0 6px 20px rgba(74,18,4,.2);
		transform: translateY(-1px);
	}
	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 1px 2px rgba(74,18,4,.3);
	}
	.submit-btn:disabled { opacity: .55; cursor: not-allowed; }

	.back-link {
		font-size: 0.8125rem;
		color: var(--color-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-align: center;
		transition: color 0.15s;
	}
	.back-link:hover { color: var(--color-text); }

	@media (max-width: 720px) {
		.auth-root { flex-direction: column; }
		.brand-panel {
			width: 100%;
			min-height: 180px;
			flex-shrink: 0;
		}
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
