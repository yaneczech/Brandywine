/**
 * Minimal ZIP reader for plugin packages: stored and deflated entries, no
 * encryption, no ZIP64. Rejects unsafe paths and oversized archives.
 */
import { inflateRawSync } from 'node:zlib';

export type UnzippedFile = { path: string; data: Uint8Array };

export type UnzipLimits = { maxFiles: number; maxTotalBytes: number };

const DEFAULT_LIMITS: UnzipLimits = { maxFiles: 500, maxTotalBytes: 20 * 1024 * 1024 };

/** Normalised relative path, or null when it is absolute or climbs out */
function safePath(name: string): string | null {
	const path = name.replace(/\\/g, '/').replace(/^\.\//, '');
	if (!path || path.startsWith('/') || /^[a-zA-Z]:/.test(path)) return null;
	if (path.split('/').some((p) => p === '..' || p === '.' || p === '')) return null;
	return path;
}

export function unzip(buffer: Uint8Array, limits: UnzipLimits = DEFAULT_LIMITS): UnzippedFile[] {
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	// End of central directory: signature 0x06054b50 within the last 64 KiB
	let eocd = -1;
	for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
		if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
	}
	if (eocd < 0) throw new Error('Not a zip file');
	const count = view.getUint16(eocd + 10, true);
	const dirOffset = view.getUint32(eocd + 16, true);
	if (count > limits.maxFiles) throw new Error(`The package has more than ${limits.maxFiles} files`);

	const decoder = new TextDecoder();
	const files: UnzippedFile[] = [];
	let total = 0;
	let p = dirOffset;
	for (let n = 0; n < count; n++) {
		if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged zip directory');
		const flags = view.getUint16(p + 8, true);
		const method = view.getUint16(p + 10, true);
		const compressed = view.getUint32(p + 20, true);
		const size = view.getUint32(p + 24, true);
		const nameLen = view.getUint16(p + 28, true);
		const extraLen = view.getUint16(p + 30, true);
		const commentLen = view.getUint16(p + 32, true);
		const localOffset = view.getUint32(p + 42, true);
		const name = decoder.decode(buffer.subarray(p + 46, p + 46 + nameLen));
		p += 46 + nameLen + extraLen + commentLen;

		if (flags & 1) throw new Error('Encrypted zip files are not supported');
		if (name.endsWith('/')) continue; // directory entry
		if (name.startsWith('__MACOSX/') || name.split('/').pop() === '.DS_Store') continue;
		const path = safePath(name);
		if (!path) throw new Error(`Unsafe path in package: ${name}`);
		total += size;
		if (total > limits.maxTotalBytes) throw new Error('The package is too large when unpacked');

		if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('Damaged zip entry');
		const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
		const raw = buffer.subarray(start, start + compressed);
		let data: Uint8Array;
		if (method === 0) data = raw;
		else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: size || 1 });
		else throw new Error(`Unsupported compression in ${name}`);
		if (data.length !== size) throw new Error(`Damaged zip entry: ${name}`);
		files.push({ path, data: new Uint8Array(data) });
	}
	return files;
}

/**
 * Drop a single top-level folder shared by every file — zips made by
 * "Compress" on macOS or Windows wrap the content in the folder's name.
 */
export function stripCommonFolder(files: UnzippedFile[]): UnzippedFile[] {
	const first = files[0]?.path.split('/')[0];
	if (!first || files.some((f) => !f.path.startsWith(first + '/'))) return files;
	return files.map((f) => ({ ...f, path: f.path.slice(first.length + 1) }));
}
