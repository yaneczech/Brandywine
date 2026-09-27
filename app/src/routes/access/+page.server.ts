import * as m from '$lib/paraglide/messages';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$db';
import { brandSettings } from '$db/schema';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { hashPassword } from '$server/auth';
import {
	hasManualAccessGrant,
	manualAccessGrant,
	MANUAL_ACCESS_COOKIE,
	safeReturnPath,
	verifyManualPassword
} from '$server/manual-access';

const COOKIE_MAX_AGE = 60 * 60 * 12;

export const load: PageServerLoad = async ({ cookies, url }) => {
	const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	const returnTo = safeReturnPath(url.searchParams.get('return'));

	if (!settings || settings.accessMode !== 'password') redirect(302, returnTo);
	if (hasManualAccessGrant(cookies.get(MANUAL_ACCESS_COOKIE), settings.accessPassword)) {
		redirect(302, returnTo);
	}

	return {
		returnTo,
		language: (settings.defaultLanguage === 'cs' ? 'cs' : 'en') as 'cs' | 'en',
		brand: {
			name: settings.name,
			logoPath: settings.logoPath,
			primaryColor: settings.primaryColor
		}
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const password = form.get('password')?.toString() ?? '';
		const returnTo = safeReturnPath(form.get('returnTo')?.toString());
		const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));

		if (!settings || settings.accessMode !== 'password') redirect(302, returnTo);
		if (!password || !(await verifyManualPassword(password, settings.accessPassword))) {
			await new Promise((resolve) => setTimeout(resolve, 300));
			const locale = settings.defaultLanguage === 'cs' ? 'cs' : 'en';
			return fail(401, { error: m.access_wrong_password({}, { locale }), returnTo });
		}

		let passwordHash = settings.accessPassword!;
		if (!passwordHash.startsWith('$2')) {
			passwordHash = await hashPassword(password);
			await db.update(brandSettings)
				.set({ accessPassword: passwordHash })
				.where(eq(brandSettings.id, 1));
		}

		cookies.set(MANUAL_ACCESS_COOKIE, manualAccessGrant(passwordHash), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: COOKIE_MAX_AGE
		});

		redirect(303, returnTo);
	}
};
