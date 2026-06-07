import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { i18n } from '$lib/i18n';
import { getSession } from '$server/auth';

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');
	if (sessionId) {
		event.locals.user = await getSession(sessionId) ?? undefined;
	}
	return resolve(event);
};

export const handle: Handle = sequence(i18n.handle(), authHandle);
