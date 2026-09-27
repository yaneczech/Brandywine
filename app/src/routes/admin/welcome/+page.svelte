<!--
  Welcome wizard — three short steps after the first administrator account:
  brand, manual access, starting content. One form; the steps only show one
  part of it at a time, so going back keeps what was entered.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import * as m from '$lib/paraglide/messages';
	import { IconUpload, IconArrowLeft, IconArrowRight, IconCheck, IconArrowUpRight } from '$lib/icons';
	import type { ActionData, PageData } from './$types';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally
	let step = $state(form && 'step' in form && typeof form.step === 'number' ? form.step : 0);
	// svelte-ignore state_referenced_locally
	let name = $state(data.name);
	// svelte-ignore state_referenced_locally
	let color = $state(data.primaryColor);
	// svelte-ignore state_referenced_locally
	let language = $state(data.language);
	// svelte-ignore state_referenced_locally
	let accessMode = $state(data.accessMode === 'password' ? 'password' : 'public');
	let password = $state('');
	// svelte-ignore state_referenced_locally
	let logoPath = $state(data.logoPath);
	let sample = $state('yes');
	let uploading = $state(false);
	let uploadError = $state('');
	let submitting = $state(false);
	let serverError = $state(false);

	const STEPS = [m.welcome_step_brand, m.welcome_step_access, m.welcome_step_content];
	const PRESETS = ['#4a1204', '#c0392b', '#e67e22', '#1f6f50', '#1d4ed8', '#6d28d9', '#171717'];
	const hexValid = $derived(/^#[0-9a-fA-F]{6}$/.test(color));
	const canContinue = $derived(step === 0 ? name.trim().length > 0 && hexValid : step === 1 ? accessMode === 'public' || password.length >= 8 : true);

	async function uploadLogo(file: File) {
		uploading = true;
		uploadError = '';
		try {
			const body = new FormData();
			body.set('file', file);
			const r = await fetch('/api/assets', { method: 'POST', body });
			let asset;
			if (r.status === 409) {
				// The same file is already in the library — use it
				const { duplicate } = await r.json();
				asset = await (await fetch(`/api/assets/${duplicate.id}`)).json();
			} else if (r.ok) {
				asset = await r.json();
			} else {
				throw new Error(r.statusText);
			}
			logoPath = `/uploads/${String(asset.storagePath).replace(/\\/g, '/')}`;
		} catch {
			uploadError = m.welcome_logo_failed();
		} finally {
			uploading = false;
		}
	}
</script>

<svelte:head><title>{m.welcome_title()} · Brandywine</title></svelte:head>

<div class="ap welcome">
	{#if form && 'done' in form && form.done}
		<div class="done">
			<span class="done-mark"><IconCheck size={28} /></span>
			<h1 class="ap-title">{m.welcome_done_title()}</h1>
			<p class="ap-sub">{form.sample ? m.welcome_done_sample() : m.welcome_done_empty()}</p>
			<div class="done-actions">
				<a class="btn btn-primary" href="/" target="_blank" rel="noopener">{m.welcome_open_manual()} <IconArrowUpRight size={15} /></a>
				<a class="btn btn-secondary" href="/admin/manual">{m.welcome_edit_manual()}</a>
				<a class="btn btn-ghost" href="/admin">{m.welcome_to_dashboard()}</a>
			</div>
			<ul class="next">
				<li><a href="/admin/colors">{m.welcome_next_colors()}</a></li>
				<li><a href="/admin/typography">{m.welcome_next_type()}</a></li>
				<li><a href="/admin/assets">{m.welcome_next_assets()}</a></li>
				<li><a href="/admin/users">{m.welcome_next_users()}</a></li>
			</ul>
		</div>
	{:else}
		<div class="ap-topbar">
			<div>
				<p class="eyebrow">{m.welcome_step_of({ step: String(step + 1), total: String(STEPS.length) })}</p>
				<h1 class="ap-title">{m.welcome_title()}</h1>
				<p class="ap-sub">{m.welcome_sub()}</p>
			</div>
		</div>

		<ol class="stepper" aria-label={m.welcome_title()}>
			{#each STEPS as label, i (i)}
				<li class:current={i === step} class:past={i < step} aria-current={i === step ? 'step' : undefined}>
					<span class="num">{i + 1}</span>{label()}
				</li>
			{/each}
		</ol>

		<form method="POST" action="?/finish" use:enhance={() => {
			submitting = true;
			serverError = false;
			return async ({ result, update }) => {
				if (result.type === 'error') serverError = true;
				await update({ reset: false });
				submitting = false;
			};
		}}>
			<input type="hidden" name="logoPath" value={logoPath} />

			<section class="panel" hidden={step !== 0}>
				<label class="field">
					<span>{m.welcome_brand_name()}</span>
					<input class="input" name="name" bind:value={name} placeholder={m.welcome_brand_name_placeholder()} autocomplete="organization" required />
				</label>

				<div class="field">
					<span>{m.welcome_brand_color()}</span>
					<div class="color-row">
						<input type="color" bind:value={color} aria-label={m.welcome_brand_color()} />
						<input class="input hex" name="primaryColor" bind:value={color} maxlength="7" spellcheck="false" />
						<div class="presets">
							{#each PRESETS as p (p)}
								<button type="button" class="preset" class:active={color.toLowerCase() === p} style="background:{p}" aria-label={p} onclick={() => (color = p)}></button>
							{/each}
						</div>
					</div>
					<small>{m.welcome_brand_color_hint()}</small>
				</div>

				<div class="field">
					<span>{m.welcome_logo()} <em>{m.welcome_optional()}</em></span>
					<div class="logo-row">
						<div class="logo-preview">
							{#if logoPath}<img src={logoPath} alt="" />{:else}<span>{name.trim().charAt(0).toUpperCase() || 'B'}</span>{/if}
						</div>
						<label class="btn btn-secondary">
							<IconUpload size={15} /> {uploading ? m.welcome_uploading() : logoPath ? m.welcome_logo_replace() : m.welcome_logo_upload()}
							<input type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" hidden
								onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) uploadLogo(f); }} />
						</label>
					</div>
					{#if uploadError}<small class="error">{uploadError}</small>{:else}<small>{m.welcome_logo_hint()}</small>{/if}
				</div>

				<fieldset class="field">
					<legend>{m.welcome_language()}</legend>
					<div class="choices">
						<label class="choice"><input type="radio" name="language" value="en" bind:group={language} /> English</label>
						<label class="choice"><input type="radio" name="language" value="cs" bind:group={language} /> Čeština</label>
					</div>
					<small>{m.welcome_language_hint()}</small>
				</fieldset>
			</section>

			<section class="panel" hidden={step !== 1}>
				<fieldset class="field">
					<legend>{m.welcome_access_question()}</legend>
					<label class="option">
						<input type="radio" name="accessMode" value="public" bind:group={accessMode} />
						<span><strong>{m.welcome_access_public()}</strong><small>{m.welcome_access_public_desc()}</small></span>
					</label>
					<label class="option">
						<input type="radio" name="accessMode" value="password" bind:group={accessMode} />
						<span><strong>{m.welcome_access_password()}</strong><small>{m.welcome_access_password_desc()}</small></span>
					</label>
				</fieldset>
				{#if accessMode === 'password'}
					<label class="field">
						<span>{m.welcome_manual_password()}</span>
						<input class="input" type="password" name="password" bind:value={password} minlength="8" autocomplete="new-password" />
						<small>{m.welcome_manual_password_hint()}</small>
					</label>
				{/if}
				<small class="later">{m.welcome_access_later()}</small>
			</section>

			<section class="panel" hidden={step !== 2}>
				<fieldset class="field">
					<legend>{m.welcome_content_question()}</legend>
					<label class="option">
						<input type="radio" name="sample" value="yes" bind:group={sample} />
						<span><strong>{m.welcome_content_sample()}</strong><small>{m.welcome_content_sample_desc()}</small></span>
					</label>
					<label class="option">
						<input type="radio" name="sample" value="no" bind:group={sample} />
						<span><strong>{m.welcome_content_empty()}</strong><small>{m.welcome_content_empty_desc()}</small></span>
					</label>
				</fieldset>
			</section>

			{#if serverError}
				<p class="error" role="alert">{m.welcome_error_server()}</p>
			{:else if form && 'error' in form}
				<p class="error" role="alert">
					{form.error === 'password' ? m.welcome_error_password() : form.error === 'color' ? m.welcome_error_color() : m.welcome_error_name()}
				</p>
			{/if}

			<div class="actions">
				{#if step > 0}
					<button type="button" class="btn btn-ghost" onclick={() => step--}><IconArrowLeft size={15} /> {m.welcome_back()}</button>
				{:else}
					<button type="submit" class="btn btn-ghost" formaction="?/skip" formnovalidate>{m.welcome_skip()}</button>
				{/if}
				{#if step < STEPS.length - 1}
					<button type="button" class="btn btn-primary" disabled={!canContinue} onclick={() => step++}>{m.welcome_next()} <IconArrowRight size={15} /></button>
				{:else}
					<button type="submit" class="btn btn-primary" disabled={submitting || uploading}>{submitting ? m.welcome_finishing() : m.welcome_finish()}</button>
				{/if}
			</div>
		</form>
	{/if}
</div>

<style>
	.welcome { max-width: 720px; }
	.eyebrow { margin: 0 0 var(--space-2); color: var(--color-muted); font-size: var(--text-xs); text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); }
	.stepper { display: flex; gap: var(--space-6); margin: 0 0 var(--space-8); padding: 0 0 var(--space-3); list-style: none; border-bottom: 1px solid var(--color-border); font-size: var(--text-sm); color: var(--color-muted); }
	.stepper li { display: flex; align-items: center; gap: var(--space-2); }
	.stepper li.current { color: var(--color-text); font-weight: 500; }
	.stepper li.past { color: var(--color-text-secondary); }
	.stepper .num { font-variant-numeric: tabular-nums; color: var(--color-muted); }
	.stepper .current .num { color: var(--color-accent); }
	.panel { display: flex; flex-direction: column; gap: var(--space-6); }
	.panel[hidden] { display: none; }
	.field { display: flex; flex-direction: column; gap: var(--space-2); margin: 0; padding: 0; border: none; }
	.field > span, .field legend { font-size: var(--text-sm); font-weight: 500; padding: 0; margin-bottom: var(--space-2); }
	.field em { color: var(--color-muted); font-style: normal; font-weight: 400; }
	.field small, .later { color: var(--color-muted); font-size: var(--text-xs); line-height: 1.5; }
	.color-row, .logo-row, .choices { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
	.color-row input[type='color'] { width: 40px; height: 40px; padding: 2px; border: 1px solid var(--color-border); border-radius: var(--radius); background: none; cursor: pointer; }
	.hex { width: 110px; font-family: var(--font-mono); }
	.presets { display: flex; gap: var(--space-2); }
	.preset { width: 24px; height: 24px; border: 1px solid var(--color-border); border-radius: 50%; cursor: pointer; }
	.preset.active { outline: 2px solid var(--color-accent); outline-offset: 2px; }
	.logo-preview { display: grid; place-items: center; width: 64px; height: 64px; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); overflow: hidden; font-size: var(--text-xl); color: var(--color-muted); }
	.logo-preview img { max-width: 80%; max-height: 80%; object-fit: contain; }
	.choice { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
	.option { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4) 0; border-bottom: 1px solid var(--color-border); cursor: pointer; }
	.option input { margin-top: 3px; }
	.option span { display: flex; flex-direction: column; gap: var(--space-1); }
	.option strong { font-weight: 500; }
	.option small { color: var(--color-muted); font-size: var(--text-sm); }
	.actions { display: flex; justify-content: space-between; margin-top: var(--space-8); padding-top: var(--space-5); border-top: 1px solid var(--color-border); }
	.error { color: var(--color-danger); font-size: var(--text-sm); }
	.done { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-3); padding-top: var(--space-8); }
	.done-mark { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; background: var(--color-accent); color: var(--color-accent-contrast); }
	.done-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-4); }
	.next { display: flex; flex-direction: column; gap: var(--space-2); margin: var(--space-8) 0 0; padding: var(--space-5) 0 0; list-style: none; border-top: 1px solid var(--color-border); font-size: var(--text-sm); }
</style>
