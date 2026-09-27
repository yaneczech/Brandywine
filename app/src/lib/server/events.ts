/**
 * Announce that something changed: runs the `on` handlers of active plugins
 * and delivers webhooks. Fire-and-forget — the request that caused the event
 * never waits for, or fails because of, a handler.
 */
import type { BrandywineEventName, BrandywineEvents } from '$lib/events';
import { serverPlugins } from './plugins';
import { deliverToWebhooks } from './webhooks';

export function emit<E extends BrandywineEventName>(event: E, payload: BrandywineEvents[E]): void {
	void dispatch(event, payload);
}

/** Awaitable variant of `emit`, for tests and scripts. */
export async function dispatch<E extends BrandywineEventName>(event: E, payload: BrandywineEvents[E]): Promise<void> {
	const jobs: Promise<unknown>[] = [];
	for (const plugin of serverPlugins) {
		const handler = plugin.on?.[event];
		if (!handler) continue;
		jobs.push(Promise.resolve()
			.then(() => handler(payload))
			.catch((e) => console.error(`[plugin ${plugin.id}] ${event} handler failed:`, e)));
	}
	jobs.push(deliverToWebhooks(event, payload).catch((e) => console.error(`[webhooks] ${event} failed:`, e)));
	await Promise.all(jobs);
}
