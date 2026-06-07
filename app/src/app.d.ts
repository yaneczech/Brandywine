import type { users } from '$lib/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type User = InferSelectModel<typeof users>;

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			user?: User;
		}
		interface PageData {
			user?: User;
		}
	}
}

export {};
