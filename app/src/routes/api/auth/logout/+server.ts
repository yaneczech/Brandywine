import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { deleteSession } from '$server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session');
	if (sessionId) {
		await deleteSession(sessionId);
		cookies.delete('session', { path: '/' });
	}
	return json({ ok: true });
};
