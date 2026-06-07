const SIGNATURES: [string, number[], string][] = [
	['image/png', [0x89, 0x50, 0x4e, 0x47], 'png'],
	['image/jpeg', [0xff, 0xd8, 0xff], 'jpg'],
	['image/gif', [0x47, 0x49, 0x46], 'gif'],
	['image/webp', [0x52, 0x49, 0x46, 0x46], 'webp'],
	['application/pdf', [0x25, 0x50, 0x44, 0x46], 'pdf']
];

export function detectMime(buffer: Buffer): string | null {
	for (const [mime, sig] of SIGNATURES) {
		if (sig.every((byte, i) => buffer[i] === byte)) return mime;
	}
	// SVG: check for XML/svg text signature
	const head = buffer.slice(0, 100).toString('utf8');
	if (head.includes('<svg') || head.includes('<?xml')) return 'image/svg+xml';
	return null;
}

export const ALLOWED_MIMES = new Set([
	'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
	'image/svg+xml', 'application/pdf', 'application/postscript',
	'image/tiff', 'image/heic', 'video/mp4', 'video/quicktime',
	'video/webm', 'audio/mpeg', 'audio/wav',
	'font/otf', 'font/ttf', 'font/woff', 'font/woff2', 'application/zip'
]);
