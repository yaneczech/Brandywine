/** Typed reads from a block's free-form `config`. */

export function configList<T = Record<string, unknown>>(config: Record<string, unknown>, key: string): T[] {
	const value = config[key];
	return Array.isArray(value) ? (value as T[]) : [];
}

export function configString(config: Record<string, unknown>, key: string, fallback = ''): string {
	const value = config[key];
	return typeof value === 'string' ? value : fallback;
}

/** Sub-headings sit one level under the block heading; without one they are the section's h2 */
export function subHeadingTag(config: Record<string, unknown>): 'h2' | 'h3' {
	return config.heading ? 'h3' : 'h2';
}

export function slugify(s: string): string {
	return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
