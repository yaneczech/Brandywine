<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import { readableOn } from '$lib/ui/contrast';
	import { IconInfoCircle, IconArrowRight } from '@tabler/icons-svelte';
	const { form, data }: { form: ActionData; data: PageData } = $props();

	const systemName = $derived(data.brand?.systemName ?? 'Brandywine');
	const logoSrc    = $derived(data.brand?.logoPath ?? '/logo.svg');
	const primary    = $derived(data.brand?.primaryColor ?? '#4A1204');
</script>

<svelte:head><title>{m.auth_setup_title()} · {systemName}</title></svelte:head>

<div class="auth-root brand-scope" style="--brand:{primary}; --brand-light:{primary}; --color-accent-contrast:{readableOn(primary)}">
	<!-- Left: brand panel -->
	<div class="brand-panel">
		<div class="brand-panel-inner">
			<div class="brand-logo">
				<img src={logoSrc} alt={systemName} class="logo-mark" />
			</div>
			<div class="brand-copy">
				<h1 class="brand-name">{systemName}</h1>
				<p class="brand-tagline">{@html m.auth_tagline()}</p>
			</div>
			<div class="brand-meta">
				<span>Open-source</span><span>Apache 2.0</span>
			</div>
		</div>
	</div>

	<!-- Right: form -->
	<div class="form-panel">
		<div class="form-inner">
			<div class="form-header">
				<h2>{m.auth_setup_title()}</h2>
				<p>{m.auth_setup_sub()}</p>
			</div>

			{#if form?.error}
				<div class="alert" role="alert">
					<IconInfoCircle size={16} stroke={1.5} />
					{form.error}
				</div>
			{/if}

			<form method="POST" class="form">
				<div class="field">
					<label for="name">{m.auth_name()}</label>
					<input
						id="name"
						type="text"
						name="name"
						placeholder={m.auth_name_placeholder()}
						autocomplete="name"
					/>
				</div>

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
					<label for="password">
						{m.auth_password()}
						<span class="label-hint">{m.auth_password_hint()}</span>
					</label>
					<input
						id="password"
						type="password"
						name="password"
						required
						minlength="12"
						autocomplete="new-password"
					/>
				</div>

				<button type="submit" class="submit-btn">
					{m.auth_create_account()}
					<IconArrowRight size={16} stroke={1.5} />
				</button>
			</form>
		</div>
	</div>
</div>
