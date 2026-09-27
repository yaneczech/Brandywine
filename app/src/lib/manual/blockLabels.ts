/**
 * Localised names and one-line descriptions of block types, shared by the
 * page editor, the block picker and the manual audit.
 */
import * as m from '$lib/paraglide/messages';

type Msg = () => string;
const messages = m as unknown as Record<string, Msg | undefined>;

export function blockLabel(type: string): string {
	return messages[`block_type_${type}`]?.() ?? type;
}

export function blockDesc(type: string): string {
	return messages[`block_desc_${type}`]?.() ?? '';
}
