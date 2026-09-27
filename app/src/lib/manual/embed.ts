/**
 * Turns a pasted URL into something the manual can embed safely.
 * Only well-known providers become iframes; direct media files play natively.
 */
export type ResolvedEmbed =
	| { kind: 'iframe'; src: string; provider: string }
	| { kind: 'video'; src: string }
	| { kind: 'audio'; src: string }
	| { kind: 'none' };

const VIDEO_EXT = /\.(mp4|webm|ogv|mov|m4v)(\?.*)?$/i;
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|flac)(\?.*)?$/i;

export function resolveEmbed(raw: unknown): ResolvedEmbed {
	const value = String(raw ?? '').trim();
	if (!value) return { kind: 'none' };

	// Uploaded / relative media files
	if (value.startsWith('/') || !/^[a-z]+:/i.test(value)) {
		const src = value.startsWith('/') ? value : `/uploads/${value.replace(/^\/+/, '')}`;
		if (AUDIO_EXT.test(src)) return { kind: 'audio', src };
		return VIDEO_EXT.test(src) ? { kind: 'video', src } : { kind: 'none' };
	}

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return { kind: 'none' };
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'none' };
	const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

	if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
		const id = host === 'youtu.be'
			? url.pathname.slice(1)
			: url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')
				? url.pathname.split('/')[2] ?? ''
				: url.searchParams.get('v') ?? '';
		if (!/^[\w-]{6,20}$/.test(id)) return { kind: 'none' };
		const start = url.searchParams.get('t')?.replace(/s$/, '');
		const qs = new URLSearchParams({ rel: '0', modestbranding: '1' });
		if (start && /^\d+$/.test(start)) qs.set('start', start);
		return { kind: 'iframe', provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id}?${qs}` };
	}

	if (host === 'vimeo.com' || host === 'player.vimeo.com') {
		const id = url.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part));
		if (!id) return { kind: 'none' };
		return { kind: 'iframe', provider: 'Vimeo', src: `https://player.vimeo.com/video/${id}?dnt=1` };
	}

	if (host === 'figma.com' || host.endsWith('.figma.com')) {
		if (url.pathname.startsWith('/embed')) return { kind: 'iframe', provider: 'Figma', src: url.href };
		return {
			kind: 'iframe',
			provider: 'Figma',
			src: `https://www.figma.com/embed?embed_host=brandywine&url=${encodeURIComponent(url.href)}`,
		};
	}

	if (host === 'loom.com') {
		const id = url.pathname.split('/').filter(Boolean).pop();
		if (!id) return { kind: 'none' };
		return { kind: 'iframe', provider: 'Loom', src: `https://www.loom.com/embed/${id}` };
	}

	if (VIDEO_EXT.test(url.pathname)) return { kind: 'video', src: url.href };
	if (AUDIO_EXT.test(url.pathname)) return { kind: 'audio', src: url.href };

	return { kind: 'none' };
}
