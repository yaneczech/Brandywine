/**
 * Welcome wizard: the first administrator sets up the brand (name, colour,
 * manual language, logo), who may read the manual, and optionally an
 * example manual. Shown once after /admin/setup; also reachable later.
 */
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$db';
import { brandSettings } from '$db/schema';
import { hasRole } from '$lib/auth/roles';
import { hashPassword } from '$server/auth';
import { invalidateLangCache } from '$server/lang-cache';
import { createSampleManual } from '$server/sample-manual';
import { getLocale } from '$lib/paraglide/runtime';

export const load: PageServerLoad = async ({ locals }) => {
	if (!hasRole(locals.user?.role, 'admin')) redirect(302, '/admin');
	const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	return {
		name: settings?.name && settings.name !== 'My Brand' ? settings.name : '',
		primaryColor: settings?.primaryColor ?? '#4A1204',
		language: settings?.defaultLanguage ?? (getLocale() === 'cs' ? 'cs' : 'en'),
		accessMode: settings?.accessMode ?? 'public',
		logoPath: settings?.logoPath ?? '',
		onboarded: Boolean(settings?.onboardedAt),
	};
};

async function saveSettings(values: Partial<typeof brandSettings.$inferInsert>) {
	await db.insert(brandSettings)
		.values({ id: 1, ...values })
		.onConflictDoUpdate({ target: brandSettings.id, set: values });
}

export const actions: Actions = {
	finish: async ({ request, locals }) => {
		if (!hasRole(locals.user?.role, 'admin')) error(403, 'Forbidden');
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const primaryColor = form.get('primaryColor')?.toString().trim() ?? '';
		const language = form.get('language')?.toString() === 'cs' ? 'cs' : 'en';
		const accessMode = form.get('accessMode')?.toString() === 'password' ? 'password' : 'public';
		const password = form.get('password')?.toString() ?? '';
		const logoPath = form.get('logoPath')?.toString().trim() ?? '';
		const sample = form.get('sample')?.toString() === 'yes';

		if (!name) return fail(400, { step: 0, error: 'name' });
		if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) return fail(400, { step: 0, error: 'color' });
		if (logoPath && !/^\/uploads\/[\w./-]+$/.test(logoPath)) return fail(400, { step: 0, error: 'logo' });
		if (accessMode === 'password' && (password.length < 8 || password.length > 200)) return fail(400, { step: 1, error: 'password' });

		await saveSettings({
			name,
			primaryColor: primaryColor.toLowerCase(),
			defaultLanguage: language,
			activeLanguages: ['en', 'cs'],
			accessMode,
			...(accessMode === 'password' ? { accessPassword: await hashPassword(password) } : {}),
			...(logoPath ? { logoPath } : {}),
			onboardedAt: new Date(),
		});
		invalidateLangCache();
		if (sample) await createSampleManual({ lang: language, brandName: name, primary: primaryColor, logoUrl: logoPath || null });
		return { done: true, sample };
	},

	skip: async ({ locals }) => {
		if (!hasRole(locals.user?.role, 'admin')) error(403, 'Forbidden');
		await saveSettings({ onboardedAt: new Date() });
		redirect(303, '/admin');
	},
};
