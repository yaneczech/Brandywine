<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { ActionData, PageData } from './$types';
	import { IconInfoCircle, IconLock, IconCheck } from '$lib/icons';

	const { form, data }: { form: ActionData; data: PageData } = $props();
</script>

<svelte:head><title>{m.auth_reset_page_title()} · Brandywine</title></svelte:head>

<div class="auth-root">
	<!-- Left: brand panel -->
	<div class="brand-panel">
		<div class="brand-panel-inner">
			<div class="brand-logo">
				<img src="/logo.svg" alt="Brandywine" class="logo-mark" />
			</div>
			<div class="brand-copy">
				<h1 class="brand-name">Brandywine</h1>
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

			{#if !data.valid}
				<!-- Invalid / expired token -->
				<div class="form-header">
					<h2>{m.auth_reset_invalid_title()}</h2>
					<p>{m.auth_reset_invalid_sub()}</p>
				</div>
				<a href="/admin/login" class="submit-btn" style="text-decoration:none;justify-content:center">
					{m.auth_back_to_login()}
				</a>
			{:else}
				<!-- Valid token — show password form -->
				<div class="form-header">
					<h2>{m.auth_reset_title()}</h2>
					<p>{m.auth_reset_sub({ email: data.email ?? '' })}</p>
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
						<label for="password">{m.auth_new_password()}</label>
						<div class="input-wrap">
							<IconLock size={16} class="input-icon" />
							<input
								id="password"
								type="password"
								name="password"
								placeholder={m.auth_new_password_placeholder()}
								required
								minlength="8"
								autocomplete="new-password"
							/>
						</div>
					</div>

					<div class="field">
						<label for="confirm">{m.auth_confirm_password()}</label>
						<div class="input-wrap">
							<IconLock size={16} class="input-icon" />
							<input
								id="confirm"
								type="password"
								name="confirm"
								placeholder={m.auth_confirm_password_placeholder()}
								required
								autocomplete="new-password"
							/>
						</div>
					</div>

					<button type="submit" class="submit-btn">
						<IconCheck size={16} stroke={1.5} /> {m.auth_reset_submit()}
					</button>
				</form>
			{/if}

			<a href="/admin/login" class="back-link">← {m.auth_back_to_login()}</a>
		</div>
	</div>
</div>
