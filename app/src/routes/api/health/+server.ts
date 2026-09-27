import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$db';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import { env } from '$env/dynamic/private';

const redis = new Redis(env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
	lazyConnect: true,
	maxRetriesPerRequest: 1,
	connectTimeout: 2_000,
	commandTimeout: 2_000
});
redis.on('error', () => {
	// Readiness responses report dependency failures without noisy unhandled events.
});

export const GET: RequestHandler = async () => {
	try {
		await Promise.all([
			db.execute(sql`select 1`),
			redis.status === 'wait' ? redis.connect().then(() => redis.ping()) : redis.ping()
		]);
		return json({ status: 'ok' }, {
			headers: { 'Cache-Control': 'no-store' }
		});
	} catch {
		return json({ status: 'unavailable' }, {
			status: 503,
			headers: { 'Cache-Control': 'no-store' }
		});
	}
};
