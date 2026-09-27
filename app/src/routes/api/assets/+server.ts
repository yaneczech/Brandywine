import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { assets } from '$db/schema';
import { inArray, isNull, or, desc, like, and, eq } from 'drizzle-orm';
import { accessibleResources } from '$server/permissions';
import { saveFile } from '$lib/server/storage';
import { enqueueThumbnail, enqueueSvgProcess, enqueueVideo } from '$lib/server/queue';
import { createHash } from 'crypto';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

// Magic bytes for common types (offset 0 unless noted)
const MAGIC: Array<{ mime: string; bytes: number[]; offset?: number }> = [
	{ mime: 'image/png',  bytes: [0x89,0x50,0x4E,0x47] },
	{ mime: 'image/jpeg', bytes: [0xFF,0xD8,0xFF] },
	{ mime: 'image/webp', bytes: [0x52,0x49,0x46,0x46], offset: 0 }, // RIFF, checked via 'WEBP' at 8
	{ mime: 'image/gif',  bytes: [0x47,0x49,0x46,0x38] },
	{ mime: 'image/avif', bytes: [0x66,0x74,0x79,0x70], offset: 4 },
	{ mime: 'image/svg+xml', bytes: [] }, // fallback by extension
	{ mime: 'application/pdf', bytes: [0x25,0x50,0x44,0x46] },
	{ mime: 'video/mp4',  bytes: [0x66,0x74,0x79,0x70], offset: 4 },
	{ mime: 'video/webm', bytes: [0x1A,0x45,0xDF,0xA3] },
	{ mime: 'font/woff2', bytes: [0x77,0x4F,0x46,0x32] },
	{ mime: 'font/woff',  bytes: [0x77,0x4F,0x46,0x46] },
];

function detectMime(buf: Buffer, filename: string): string {
	for (const sig of MAGIC) {
		if (!sig.bytes.length) continue;
		const off = sig.offset ?? 0;
		if (buf.length < off + sig.bytes.length) continue;
		const match = sig.bytes.every((b, i) => buf[off + i] === b);
		if (match) {
			// WEBP extra check
			if (sig.mime === 'image/webp') {
				if (buf.length < 12) continue;
				const webp = buf.slice(8, 12).toString('ascii');
				if (webp !== 'WEBP') continue;
			}
			// ISO Base Media files all contain `ftyp` at offset 4. Inspect the
			// major brand so MP4/MOV files are not accidentally stored as AVIF.
			if (sig.mime === 'image/avif') {
				const brand = buf.slice(8, 12).toString('ascii');
				if (brand !== 'avif' && brand !== 'avis') continue;
			}
			if (sig.mime === 'video/mp4') {
				const brand = buf.slice(8, 12).toString('ascii');
				if (brand === 'avif' || brand === 'avis') continue;
				if (brand === 'qt  ') return 'video/quicktime';
			}
			return sig.mime;
		}
	}
	// Extension fallback for SVG / text types
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	const extMap: Record<string, string> = {
		svg: 'image/svg+xml', svgz: 'image/svg+xml',
		pdf: 'application/pdf',
		zip: 'application/zip', ai: 'application/postscript',
		eps: 'application/postscript', sketch: 'application/zip',
		mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
		mp3: 'audio/mpeg', wav: 'audio/wav',
		ttf: 'font/ttf', otf: 'font/otf',
		woff: 'font/woff', woff2: 'font/woff2',
	};
	return extMap[ext] ?? 'application/octet-stream';
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const page   = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const limit  = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 60)));
	const offset = (page - 1) * limit;
	const search = url.searchParams.get('q')?.trim() ?? '';
	const type   = url.searchParams.get('type') ?? ''; // image | video | document | other
	const folder = url.searchParams.get('folder') ?? '';

	const mimeFilter: Record<string, string> = {
		image: 'image/%', video: 'video/%',
		document: 'application/pdf', font: 'font/%',
	};

	function buildWhere(folderIds?: string[]) {
		const conditions = [];
		if (search)                  conditions.push(like(assets.filename, `%${search}%`));
		if (type && mimeFilter[type]) conditions.push(like(assets.mime, mimeFilter[type]));
		if (folder)                  conditions.push(eq(assets.folderId, folder));
		else if (folderIds)          conditions.push(or(isNull(assets.folderId), inArray(assets.folderId, folderIds))!);
		return conditions.length ? and(...conditions) : undefined;
	}

	if (canEdit(locals.user.role)) {
		const rows = await db.select().from(assets)
			.where(buildWhere())
			.orderBy(desc(assets.createdAt))
			.limit(limit).offset(offset);
		return json({ data: rows, page, limit });
	}

	const folderIds = await accessibleResources(locals.user, 'folder', 'read');
	if (folderIds.length === 0) return json({ data: [], page, limit });

	// Non-admins only see assets that belong to explicitly accessible folders.
	// Root assets (folderId IS NULL) are not implicitly shared with all users.
	function buildWhereNonAdmin() {
		const conditions = [];
		if (search)                  conditions.push(like(assets.filename, `%${search}%`));
		if (type && mimeFilter[type]) conditions.push(like(assets.mime, mimeFilter[type]));
		// Always scope to accessible folders (never expose root assets)
		if (folder && folderIds.includes(folder)) {
			conditions.push(eq(assets.folderId, folder));
		} else {
			conditions.push(inArray(assets.folderId, folderIds));
		}
		return conditions.length ? and(...conditions) : undefined;
	}

	const rows = await db.select().from(assets)
		.where(buildWhereNonAdmin())
		.orderBy(desc(assets.createdAt))
		.limit(limit).offset(offset);
	return json({ data: rows, page, limit });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const form = await request.formData().catch(() => null);
	if (!form) error(400, 'Expected multipart/form-data');

	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'Missing file field');
	if (file.size === 0) error(400, 'File is empty');
	if (file.size > MAX_FILE_SIZE) error(413, `File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);

	// Validate folderId — must exist in DB if provided
	const rawFolderId = (form.get('folderId') as string | null)?.trim() || null;
	let folderId: string | null = null;
	if (rawFolderId) {
		const { folders } = await import('$db/schema');
		const { eq: eqf } = await import('drizzle-orm');
		const [folder] = await db.select({ id: folders.id }).from(folders)
			.where(eqf(folders.id, rawFolderId)).limit(1);
		if (!folder) error(400, 'Folder not found');
		folderId = rawFolderId;
	}

	// Parse and validate tags
	let tags: string[] = [];
	const rawTags = form.get('tags') as string | null;
	if (rawTags) {
		let parsed: unknown;
		try { parsed = JSON.parse(rawTags); } catch { error(400, 'tags must be a JSON array'); }
		if (!Array.isArray(parsed)) error(400, 'tags must be a JSON array');
		if (parsed.length > 30) error(400, 'Maximum 30 tags allowed');
		for (const t of parsed) {
			if (typeof t !== 'string') error(400, 'Each tag must be a string');
			if (t.length > 64) error(400, 'Tag too long (max 64 chars)');
		}
		tags = (parsed as string[]).map(t => t.trim().toLowerCase()).filter(Boolean);
	}

	// Read into buffer for magic-byte check
	const buffer = Buffer.from(await file.arrayBuffer());
	const mime = detectMime(buffer, file.name);

	// Hash for dedup detection
	const hash = createHash('sha256').update(buffer).digest('hex');
	const [duplicate] = await db
		.select({ id: assets.id, filename: assets.filename, folderId: assets.folderId })
		.from(assets)
		.where(eq(assets.hash, hash))
		.limit(1);
	if (duplicate) {
		return json(
			{ message: `This file already exists as “${duplicate.filename}”.`, duplicate },
			{ status: 409 }
		);
	}

	// Save to disk
	const storagePath = await saveFile(file.name, buffer, 'assets');

	// Insert into DB (after save — no orphan risk reversed; delete on DB error)
	try {
		const [inserted] = await db.insert(assets).values({
			filename: file.name,
			mime,
			size: file.size,
			storagePath,
			folderId,
			tags,
			hash,
			metadata: { originalName: file.name },
		}).returning();

		// Queue background jobs
		const needsThumb = mime.startsWith('image/') || mime === 'application/pdf' || mime === 'application/postscript';
		if (needsThumb) {
			await enqueueThumbnail(inserted.id, storagePath, mime).catch(() => {});
		}
		if (mime === 'image/svg+xml') {
			await enqueueSvgProcess(inserted.id, storagePath).catch(() => {});
		}
		if (mime.startsWith('video/')) {
			await enqueueVideo(inserted.id, storagePath).catch(() => {});
		}

		return json(inserted, { status: 201 });
	} catch (e) {
		// Best-effort cleanup on DB failure
		const { deleteFile } = await import('$lib/server/storage');
		await deleteFile(storagePath).catch(() => {});
		throw e;
	}
};
