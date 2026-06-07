import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$db';
import { colors, colorPalettes } from '$db/schema';
import { asc, eq } from 'drizzle-orm';
import { hexToRgb } from '$lib/utils/colors';

function slug(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function download(body: string, filename: string, mime: string) {
	return new Response(body, {
		headers: {
			'Content-Type': mime,
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store'
		}
	});
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const rows = await db
		.select({ color: colors, palette: { name: colorPalettes.name } })
		.from(colors)
		.leftJoin(colorPalettes, eq(colors.paletteId, colorPalettes.id))
		.orderBy(asc(colorPalettes.order), asc(colors.order));

	switch (params.format) {

		case 'css': {
			const groups: Record<string, typeof rows> = {};
			for (const r of rows) {
				const group = r.palette?.name ?? 'Global';
				(groups[group] ??= []).push(r);
			}
			const lines = [':root {'];
			for (const [group, items] of Object.entries(groups)) {
				lines.push(`\n  /* ${group} */`);
				for (const { color: c } of items) {
					const rgb = hexToRgb(c.hex);
					lines.push(`  --color-${slug(c.name)}: ${c.hex};`);
					lines.push(`  --color-${slug(c.name)}-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};`);
				}
			}
			lines.push('}');
			return download(lines.join('\n'), 'colors.css', 'text/css');
		}

		case 'scss': {
			const groups: Record<string, typeof rows> = {};
			for (const r of rows) {
				const group = r.palette?.name ?? 'Global';
				(groups[group] ??= []).push(r);
			}
			const lines: string[] = [];
			for (const [group, items] of Object.entries(groups)) {
				lines.push(`// ${group}`);
				for (const { color: c } of items) {
					const rgb = hexToRgb(c.hex);
					lines.push(`$${slug(c.name)}: ${c.hex};`);
					lines.push(`$${slug(c.name)}-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};`);
				}
				lines.push('');
			}
			return download(lines.join('\n'), 'colors.scss', 'text/x-scss');
		}

		case 'json': {
			// W3C Design Tokens Community Group format
			const tokens: Record<string, unknown> = {};
			const groups: Record<string, typeof rows> = {};
			for (const r of rows) {
				const group = r.palette?.name ?? 'global';
				(groups[group] ??= []).push(r);
			}
			for (const [group, items] of Object.entries(groups)) {
				const groupSlug = slug(group);
				tokens[groupSlug] = {};
				for (const { color: c } of items) {
					(tokens[groupSlug] as Record<string, unknown>)[slug(c.name)] = {
						$value: c.hex,
						$type: 'color',
						$description: [c.pantoneRef, c.ralRef].filter(Boolean).join(' / ') || undefined
					};
				}
			}
			const body = JSON.stringify(tokens, null, 2);
			return new Response(body, {
				headers: {
					'Content-Type': 'application/json',
					'Content-Disposition': 'attachment; filename="colors.tokens.json"',
					'Cache-Control': 'no-store'
				}
			});
		}

		case 'gpl': {
			// GIMP Palette format
			const lines = [
				'GIMP Palette',
				'Name: Brand Colors',
				'Columns: 8',
				'#'
			];
			for (const { color: c } of rows) {
				const { r, g, b } = hexToRgb(c.hex);
				lines.push(`${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${c.name}`);
			}
			return download(lines.join('\n'), 'colors.gpl', 'text/plain');
		}

		case 'ase': {
			// Adobe Swatch Exchange — binary format
			// Header: 'ASEF' magic + version 1.0 + block count
			const entries: { name: string; r: number; g: number; b: number }[] = rows.map(({ color: c }) => {
				const { r, g, b } = hexToRgb(c.hex);
				return { name: c.name, r, g, b };
			});

			// Each color block: type(2) + length(4) + name_len(2) + name(utf16be) + 'RGB '(4) + r(4f) + g(4f) + b(4f) + type(2)
			const blocks: Uint8Array[] = [];
			for (const e of entries) {
				const nameUtf16 = Buffer.alloc((e.name.length + 1) * 2);
				for (let i = 0; i < e.name.length; i++) nameUtf16.writeUInt16BE(e.name.charCodeAt(i), i * 2);
				const blockData = Buffer.alloc(2 + nameUtf16.length + 4 + 4 + 4 + 4 + 2);
				let offset = 0;
				blockData.writeUInt16BE(nameUtf16.length / 2, offset); offset += 2;
				nameUtf16.copy(blockData, offset); offset += nameUtf16.length;
				blockData.write('RGB ', offset, 'ascii'); offset += 4;
				blockData.writeFloatBE(e.r / 255, offset); offset += 4;
				blockData.writeFloatBE(e.g / 255, offset); offset += 4;
				blockData.writeFloatBE(e.b / 255, offset); offset += 4;
				blockData.writeUInt16BE(0, offset); // global color type
				const block = Buffer.alloc(6 + blockData.length);
				block.writeUInt16BE(0x0001, 0); // color entry block type
				block.writeUInt32BE(blockData.length, 2);
				blockData.copy(block, 6);
				blocks.push(block);
			}
			const header = Buffer.alloc(12);
			header.write('ASEF', 0, 'ascii');
			header.writeUInt16BE(1, 4);
			header.writeUInt16BE(0, 6);
			header.writeUInt32BE(entries.length, 8);
			const total = Buffer.concat([header, ...blocks]);
			return new Response(total, {
				headers: {
					'Content-Type': 'application/octet-stream',
					'Content-Disposition': 'attachment; filename="colors.ase"',
					'Cache-Control': 'no-store'
				}
			});
		}

		default:
			error(400, `Unsupported format: ${params.format}`);
	}
};
