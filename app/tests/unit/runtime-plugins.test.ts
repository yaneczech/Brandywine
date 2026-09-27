import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { createZip } from '../../src/lib/server/zip';
import { stripCommonFolder, unzip } from '../../src/lib/server/unzip';
import { elementHtml, renderTemplate, runtimeBlockDefinitions, validateManifest } from '../../src/lib/plugins/runtime';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

/** Rewrite a stored zip entry as deflated (method 8) to cover both paths */
function deflateFirstEntry(zip: Buffer, content: string): Buffer {
	const compressed = deflateRawSync(Buffer.from(content));
	const nameLen = zip.readUInt16LE(26);
	const header = Buffer.from(zip.subarray(0, 30 + nameLen));
	header.writeUInt16LE(8, 8);
	header.writeUInt32LE(compressed.length, 18);
	const rest = zip.subarray(30 + nameLen + Buffer.byteLength(content));
	const out = Buffer.concat([header, compressed, rest]);
	const shift = Buffer.byteLength(content) - compressed.length;
	const eocd = out.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
	const dir = out.readUInt32LE(eocd + 16) - shift;
	out.writeUInt32LE(dir, eocd + 16);
	out.writeUInt16LE(8, dir + 10);
	out.writeUInt32LE(compressed.length, dir + 20);
	return out;
}

describe('unzip', () => {
	it('reads stored entries', () => {
		const zip = createZip([{ name: 'manifest.json', data: enc('{"a":1}') }, { name: 'public/x.txt', data: enc('hi') }]);
		expect(unzip(zip).map((f) => [f.path, dec(f.data)])).toEqual([['manifest.json', '{"a":1}'], ['public/x.txt', 'hi']]);
	});

	it('reads deflated entries', () => {
		const text = 'hello '.repeat(200);
		const zip = deflateFirstEntry(createZip([{ name: 'server.js', data: enc(text) }]), text);
		expect(dec(unzip(zip)[0].data)).toBe(text);
	});

	it('rejects paths that climb out or are absolute', () => {
		expect(() => unzip(createZip([{ name: '../evil.js', data: enc('x') }]))).toThrow(/Unsafe path/);
		expect(() => unzip(createZip([{ name: '/etc/passwd', data: enc('x') }]))).toThrow(/Unsafe path/);
	});

	it('enforces size and count limits', () => {
		const zip = createZip([{ name: 'a', data: new Uint8Array(100) }, { name: 'b', data: new Uint8Array(100) }]);
		expect(() => unzip(zip, { maxFiles: 1, maxTotalBytes: 1e6 })).toThrow(/more than 1 files/);
		expect(() => unzip(zip, { maxFiles: 10, maxTotalBytes: 150 })).toThrow(/too large/);
	});

	it('rejects non-zip data', () => {
		expect(() => unzip(enc('not a zip at all, definitely not'))).toThrow(/Not a zip/);
	});

	it('drops a single wrapping folder', () => {
		const files = [{ path: 'hello/manifest.json', data: enc('') }, { path: 'hello/server.js', data: enc('') }];
		expect(stripCommonFolder(files).map((f) => f.path)).toEqual(['manifest.json', 'server.js']);
		expect(stripCommonFolder([{ path: 'manifest.json', data: enc('') }]).map((f) => f.path)).toEqual(['manifest.json']);
	});
});

describe('runtime plugin manifest', () => {
	const base = {
		id: 'hello', name: 'Hello', version: '1.0.0',
		blocks: [{ type: 'hello_banner', label: 'Banner', group: 'text', template: '<b>{{title}}</b>',
			fields: [{ key: 'title', type: 'text', label: 'Title', required: true }] }],
		modules: [{ id: 'stats', label: { en: 'Stats', cs: 'Statistiky' }, group: 'admin', element: 'hello-stats', minRole: 'admin' }],
	};

	it('accepts a valid manifest and normalises labels', () => {
		const m = validateManifest(base);
		expect(m.blocks?.[0].label).toEqual({ en: 'Banner' });
		expect(m.modules?.[0].minRole).toBe('admin');
	});

	it.each([
		[{ id: 'Hello' }, /manifest.id/],
		[{ version: '1' }, /version/],
		[{ blocks: [{ ...base.blocks[0], type: 'banner' }] }, /start with "hello_"/],
		[{ blocks: [{ ...base.blocks[0], group: 'nope' }] }, /group/],
		[{ blocks: [{ ...base.blocks[0], fields: [{ key: 'x', type: 'html', label: 'X' }] }] }, /type must be one of/],
		[{ modules: [{ ...base.modules[0], element: 'nodash' }] }, /custom element/],
		[{ server: '../../etc/passwd' }, /relative file path/],
	])('rejects %j', (patch, message) => {
		expect(() => validateManifest({ ...base, ...patch })).toThrow(message);
	});

	it('escapes template values', () => {
		expect(renderTemplate('<p>{{ title }}</p>{{missing}}', { title: '<script>"x"</script>' }))
			.toBe('<p>&lt;script&gt;&quot;x&quot;&lt;/script&gt;</p>');
		expect(elementHtml('hello-counter', { a: '"<>' })).toBe('<hello-counter data-config="{&quot;a&quot;:&quot;\\&quot;&lt;&gt;&quot;}"></hello-counter>');
	});

	it('builds block definitions with an audit for required fields', () => {
		const [def] = runtimeBlockDefinitions([validateManifest(base)]);
		expect(def.type).toBe('hello_banner');
		let empty = 0;
		const ctx = { str: (v: unknown) => (typeof v === 'string' ? v.trim() : ''), empty: () => empty++ } as never;
		def.audit?.({}, ctx);
		def.audit?.({ title: 'Hi' }, ctx);
		expect(empty).toBe(1);
	});
});
