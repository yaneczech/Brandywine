<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import { ensureContrast, readableOn } from '$lib/ui/contrast';
	import { IconInfoCircle, IconArrowRight, IconCheck } from '$lib/icons';
	const { form, data }: { form: ActionData; data: PageData } = $props();

	const systemName = $derived(data.brand?.systemName ?? 'Brandywine');
	const logoSrc    = $derived(data.brand?.logoPath ?? '/logo.svg');
	const primary    = $derived(data.brand?.primaryColor ?? '#4A1204');
	// Brand as UI accent on the admin background: same hue, ≥ 3:1
	const uiBrand = $derived(ensureContrast(primary, '#f7f7f5'));

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
				forgotError = m.auth_send_failed();
			}
		} catch {
			forgotError = m.auth_network_error();
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

<div class="auth-root brand-scope" style="--brand:{uiBrand}; --brand-light:{uiBrand}; --color-accent-contrast:{readableOn(uiBrand)}">
	<!-- Left: brand panel -->
	<div class="brand-panel">
		<div class="brand-panel-inner">
			<div class="brand-logo">
				<img src={logoSrc} alt={systemName} class="logo-mark" />
			</div>
			<div class="brand-copy">
				<h1 class="brand-name">{systemName}</h1>
				<p class="brand-tagline">{#each m.auth_tagline().split(/<br\s*\/?>/) as line, i (i)}{#if i}<br />{/if}{line}{/each}</p>
			</div>
			<div class="brand-meta">
				<span>Open-source</span><span>Apache 2.0</span>
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
							placeholder="you@example.com"
							required
							autocomplete="email"
						/>
					</div>

					<div class="field">
						<div class="field-label-row">
							<label for="password">{m.auth_password()}</label>
							<button type="button" class="forgot-link" onclick={() => showForgot = true}>
								{m.auth_forgot_link()}
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
						<IconArrowRight size={16} stroke={1.5} />
					</button>
				</form>

			{:else}
				<!-- ── Forgot password form ── -->
				<div class="form-header">
					<h2>{m.auth_forgot_title()}</h2>
					<p>{m.auth_forgot_sub()}</p>
				</div>

				{#if forgotSent}
					<!-- Success state -->
					<div class="success-box">
						<div class="success-icon"><IconCheck size={20} stroke={2} /></div>
						<p>{m.auth_forgot_sent({ email: forgotEmail })}</p>
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
								placeholder="you@example.com"
								autocomplete="email"
								onkeydown={e => e.key === 'Enter' && sendReset()}
							/>
						</div>
						<button class="submit-btn" onclick={sendReset} disabled={forgotLoading || !forgotEmail.trim()}>
							{forgotLoading ? m.auth_sending() : m.auth_forgot_send()}
							{#if !forgotLoading}<IconArrowRight size={16} stroke={1.5} />{/if}
						</button>
					</div>
				{/if}

				<button type="button" class="back-link" onclick={backToLogin}>
					← {m.auth_back_to_login()}
				</button>
			{/if}

		</div>
	</div>
</div>
