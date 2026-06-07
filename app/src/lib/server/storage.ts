import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, dirname, extname, resolve } from 'path';
import { randomBytes } from 'crypto';
import { UPLOAD_DIR } from '$env/static/private';

function safeFilename(originalName: string): string {
	const ext = extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
	const id = randomBytes(12).toString('hex');
	return `${id}${ext}`;
}

export async function saveFile(originalFilename: string, buffer: Buffer, subfolder?: string): Promise<string> {
	const filename = safeFilename(originalFilename);
	const datePart = new Date().toISOString().slice(0, 10);
	const relativePath = subfolder
		? join(subfolder, datePart, filename)
		: join(datePart, filename);
	const fullPath = join(UPLOAD_DIR, relativePath);

	// Ujisti se, že fullPath skutečně leží uvnitř UPLOAD_DIR
	const resolvedUploadDir = resolve(UPLOAD_DIR);
	const resolvedFull = resolve(fullPath);
	if (!resolvedFull.startsWith(resolvedUploadDir + '/')) {
		throw new Error('Invalid upload path');
	}

	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, buffer);
	return relativePath;
}

export async function deleteFile(relativePath: string): Promise<void> {
	const fullPath = join(UPLOAD_DIR, relativePath);
	await unlink(fullPath);
}

export function getPublicUrl(relativePath: string): string {
	return `/uploads/${relativePath.replace(/\\/g, '/')}`;
}
