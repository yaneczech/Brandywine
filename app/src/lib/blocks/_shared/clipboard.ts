/** Clipboard write with a hidden-textarea fallback for browsers that block the async API. */
export async function copyToClipboard(value: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(value);
	} catch {
		try {
			const textarea = document.createElement('textarea');
			textarea.value = value;
			textarea.setAttribute('readonly', '');
			textarea.style.position = 'fixed';
			textarea.style.left = '-9999px';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			textarea.remove();
		} catch {
			// Keep the visual confirmation even when the browser blocks clipboard writes.
		}
	}
}
