/**
 * App-wide toast queue. `toast.success('Saved')`, `toast.error(msg)`.
 * Rendered once by <Toaster /> in the admin layout.
 */
export type ToastTone = 'success' | 'error' | 'info';
export type Toast = { id: number; tone: ToastTone; message: string; detail?: string };

let seq = 0;
export const toasts = $state<Toast[]>([]);

function push(tone: ToastTone, message: string, detail?: string, ms = tone === 'error' ? 6000 : 3200) {
	const id = ++seq;
	toasts.push({ id, tone, message, detail });
	if (toasts.length > 4) toasts.shift();
	if (ms > 0) setTimeout(() => dismiss(id), ms);
	return id;
}

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}

export const toast = {
	success: (message: string, detail?: string) => push('success', message, detail),
	error: (message: string, detail?: string) => push('error', message, detail),
	info: (message: string, detail?: string) => push('info', message, detail),
	dismiss
};
