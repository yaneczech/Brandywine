<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { isExternal, hostOf, linkHref } from '../_shared/links';
	import { configList } from '../_shared/config';
	import { IconArrowUpRight } from '$lib/icons';

	const { block }: BlockRenderProps = $props();

	const list = <T = Record<string, unknown>>(key: string) => configList<T>(block.config, key);

	const links = $derived(list<{ title: string; url: string; description?: string }>('items').filter((item) => item?.url));
</script>

{#if links.length}
	<ul class="links-grid">
		{#each links as link, li (li)}
			{@const href = linkHref(link.url)}
			{@const external = isExternal(href)}
			<li>
				<a class="link-card" {href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
					<span class="link-card-body">
						<strong>{link.title || hostOf(href) || link.url}</strong>
						<small>{link.description || hostOf(href) || link.url}</small>
					</span>
					<span class="link-card-arrow"><IconArrowUpRight size={16} stroke={1.5} /></span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 0 32px; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--manual-border); }
	.links-grid li { display: flex; border-bottom: 1px solid var(--manual-border); }
</style>
