/**
 * Helpers for block editors: typed reads of the current config and setters
 * that hand a new config object to `onUpdate` (the page editor keeps it until
 * the user saves).
 *
 *   const { str, set, setStr } = configFields(() => cfg, onUpdate);
 *   <input value={str('title')} oninput={(e) => setStr(e, 'title')} />
 */
export function configFields(getCfg: () => Record<string, unknown>, onUpdate: (next: Record<string, unknown>) => void) {
	const value = (key: string) => getCfg()[key];
	const set = (key: string, next: unknown) => onUpdate({ ...getCfg(), [key]: next });
	const target = (e: Event) => e.target as HTMLInputElement;
	return {
		str: (key: string): string => (typeof value(key) === 'string' ? (value(key) as string) : ''),
		num: (key: string, def = 0): number => (typeof value(key) === 'number' ? (value(key) as number) : def),
		bool: (key: string, def = false): boolean => (typeof value(key) === 'boolean' ? (value(key) as boolean) : def),
		set,
		setStr: (e: Event, key: string) => set(key, target(e).value),
		setNum: (e: Event, key: string) => set(key, Number(target(e).value)),
		setBool: (e: Event, key: string) => set(key, target(e).checked),
	};
}

/** Array config value, copied so the editor can keep local list state */
export function configArray<T>(cfg: Record<string, unknown>, key: string): T[] {
	return Array.isArray(cfg[key]) ? [...(cfg[key] as T[])] : [];
}

/** Move a list item; out-of-range targets leave the list unchanged */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
	if (to < 0 || to >= items.length) return items;
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}
