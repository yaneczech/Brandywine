import { describe, expect, it } from 'vitest';
import { padSvg, svgBox, paddedRatio } from '../../src/lib/manual/svg-pad';
import { createZip } from '../../src/lib/server/zip';

describe('svg padding', () => {
	it('reads the box from viewBox or width/height', () => {
		expect(svgBox('<svg viewBox="0 0 200 100"></svg>')).toEqual({ x: 0, y: 0, width: 200, height: 100 });
		expect(svgBox('<svg width="40px" height="20"></svg>')).toEqual({ x: 0, y: 0, width: 40, height: 20 });
		expect(svgBox('<svg width="100%"></svg>')).toBeNull();
	});

	it('grows the viewBox and keeps explicit dimensions proportional', () => {
		const out = padSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 200 100" width="200" height="100"><path/></svg>', 10, 50);
		expect(out).toContain('viewBox="-10 -40 240 200"');
		expect(out).toContain('width="240"');
		expect(out).toContain('height="200"');
		expect(out).toContain('<path/>');
	});

	it('adds a viewBox and xmlns when only width/height exist', () => {
		const out = padSvg('<svg width="100" height="50"></svg>', 20, 0);
		expect(out).toContain('viewBox="-20 0 140 50"');
		expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
	});

	it('leaves unknown documents untouched', () => {
		expect(padSvg('<div>no svg</div>', 10, 10)).toBe('<div>no svg</div>');
	});

	it('computes the padded aspect ratio', () => {
		expect(paddedRatio({ x: 0, y: 0, width: 200, height: 100 }, 0, 50)).toBe(1);
	});
});

describe('zip writer', () => {
	it('produces a readable archive with UTF-8 names', () => {
		const zip = createZip([
			{ name: 'logo/čeština.txt', data: new TextEncoder().encode('ahoj') },
			{ name: 'b.bin', data: new Uint8Array([1, 2, 3]) },
		]);
		// End of central directory reports both entries
		const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
		expect(eocd).toBeGreaterThan(0);
		expect(zip.readUInt16LE(eocd + 10)).toBe(2);
		// First local entry: stored data follows the header and name
		const nameLength = zip.readUInt16LE(26);
		expect(zip.subarray(30, 30 + nameLength).toString('utf8')).toBe('logo/čeština.txt');
		expect(zip.subarray(30 + nameLength, 34 + nameLength).toString('utf8')).toBe('ahoj');
	});
});
