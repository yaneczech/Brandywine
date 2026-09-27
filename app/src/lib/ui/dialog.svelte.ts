/**
 * Promise-based dialogs replacing window.confirm / window.prompt.
 *   if (!(await ask({ title: 'Delete colour?' }))) return;
 *   const code = await askText({ title: 'Language code', placeholder: 'cs' });
 * Rendered by <DialogHost /> in the admin layout.
 */
export type AskOptions = {
	title: string;
	description?: string;
	confirmLabel?: string;
	tone?: 'danger' | 'primary';
};
export type AskTextOptions = AskOptions & { label?: string; placeholder?: string; initial?: string };

type Pending =
	| { kind: 'confirm'; opts: AskOptions; resolve: (v: boolean) => void }
	| { kind: 'text'; opts: AskTextOptions; resolve: (v: string | null) => void };

export const dialogState = $state<{ current: Pending | null }>({ current: null });

export function ask(opts: AskOptions): Promise<boolean> {
	return new Promise((resolve) => {
		dialogState.current = { kind: 'confirm', opts: { tone: 'danger', ...opts }, resolve };
	});
}

export function askText(opts: AskTextOptions): Promise<string | null> {
	return new Promise((resolve) => {
		dialogState.current = { kind: 'text', opts: { tone: 'primary', ...opts }, resolve };
	});
}

export function settle(value: boolean | string | null) {
	const cur = dialogState.current;
	if (!cur) return;
	dialogState.current = null;
	if (cur.kind === 'confirm') cur.resolve(value === true);
	else cur.resolve(typeof value === 'string' ? value : null);
}
