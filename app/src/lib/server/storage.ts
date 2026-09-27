import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, dirname, extname, resolve } from 'path';
import { randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

const UPLOAD_DIR = env.UPLOAD_DIR ?? './uploads';

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

	// Make sure fullPath really lies inside UPLOAD_DIR
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
	const root = resolve(UPLOAD_DIR);
	const fullPath = resolve(join(root, relativePath));
	if (!fullPath.startsWith(root + '/')) throw new Error('Invalid upload path');
	await unlink(fullPath);
}

export async function deleteFiles(paths: Array<string | null | undefined>): Promise<void> {
	const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
	await Promise.all(uniquePaths.map((path) => deleteFile(path).catch(() => {})));
}

export function getPublicUrl(relativePath: string): string {
	return `/uploads/${relativePath.replace(/\\/g, '/')}`;
}
