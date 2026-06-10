import type { SessionUser } from '$lib/server/auth';

type User = SessionUser;

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			user?: User;
			paraglide?: {
				lang: 'en' | 'cs';
				textDirection: 'ltr' | 'rtl';
			};
		}
		interface PageData {
			user?: User;
		}
	}
}

export {};
