import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$db';
import { assets } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createReadStream, statSync } from 'fs';
import { join, resolve } from 'path';
import { UPLOAD_DIR } from '$env/static/private';
import { can } from '$server/permissions';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const [asset] = await db.select().from(assets).where(eq(assets.id, params.id)).limit(1);
	if (!asset) error(404, 'Asset not found');

	const allowed = await can(locals.user, 'download', 'folder', asset.folderId ?? '__root__');
	if (!allowed) error(403, 'Forbidden');

	// Ověř, že storagePath neuniká z UPLOAD_DIR
	const resolvedUploadDir = resolve(UPLOAD_DIR);
	const resolvedPath = resolve(join(UPLOAD_DIR, asset.storagePath));
	if (!resolvedPath.startsWith(resolvedUploadDir + '/')) error(400, 'Invalid path');

	// Ověř existenci souboru na disku před odesláním — jinak browser dostane nekompletní stream
	let stat: ReturnType<typeof statSync>;
	try { stat = statSync(resolvedPath); } catch {
		error(404, `File not found on disk. UPLOAD_DIR may have been cleared (${UPLOAD_DIR} is volatile). Re-upload the file.`);
	}
	if (!stat!.isFile()) error(400, 'Not a file');

	// Sanitize filename pro Content-Disposition — žádné \r\n ani uvozovky
	const safeFilename = asset.filename.replace(/["\\]/g, '').replace(/[\r\n]/g, '');

	const stream = createReadStream(resolvedPath);
	return new Response(stream as unknown as ReadableStream, {
		headers: {
			'Content-Type':        asset.mime,
			'Content-Disposition': `attachment; filename="${safeFilename}"`,
			'Content-Length':      String(stat!.size),
		}
	});
};
