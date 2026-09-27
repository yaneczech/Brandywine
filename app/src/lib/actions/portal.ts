/**
 * Moves an element to an outer container while it is mounted, so fixed-position
 * layers (dialogs, lightboxes) escape ancestors that create their own
 * containing block — e.g. `container-type`, `transform` or `filter`.
 * The target defaults to the nearest `selector` ancestor, falling back to <body>,
 * which keeps inherited theme custom properties when a themed root exists.
 */
export function portal(node: HTMLElement, selector = 'body') {
	const origin = node.parentNode;
	const target = (origin instanceof Element && origin.closest(selector)) || document.body;
	target.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}
