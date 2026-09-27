export type FocusTrapOptions = {
	onEscape?: () => void;
	initialFocus?: string;
	restoreFocus?: boolean;
};

const FOCUSABLE = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(',');

function focusableElements(node: HTMLElement): HTMLElement[] {
	return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
		return !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true';
	});
}

/** Keeps keyboard focus inside a modal and restores it when the modal closes. */
export function focusTrap(node: HTMLElement, initialOptions: FocusTrapOptions = {}) {
	let options = initialOptions;
	const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

	queueMicrotask(() => {
		const requested = options.initialFocus
			? node.querySelector<HTMLElement>(options.initialFocus)
			: null;
		(requested ?? focusableElements(node)[0] ?? node).focus();
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && options.onEscape) {
			event.preventDefault();
			options.onEscape();
			return;
		}

		if (event.key !== 'Tab') return;
		const focusable = focusableElements(node);
		if (focusable.length === 0) {
			event.preventDefault();
			node.focus();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', handleKeydown);

	return {
		update(nextOptions: FocusTrapOptions = {}) {
			options = nextOptions;
		},
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			if (options.restoreFocus !== false && previousFocus?.isConnected) {
				queueMicrotask(() => previousFocus.focus());
			}
		}
	};
}
