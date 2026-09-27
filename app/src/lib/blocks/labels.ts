/**
 * Localised block names and one-line descriptions for the picker, editor and
 * audit. Looks up the `block_type_<type>` / `block_desc_<type>` messages first,
 * then the definition's own `label` / `description`, then the type itself.
 */
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { getBlockDefinition } from './index';

type Msg = () => string;
const messages = m as unknown as Record<string, Msg | undefined>;

function fromDefinition(value: Partial<Record<'en' | 'cs', string>> | undefined): string | undefined {
	if (!value) return undefined;
	const locale = getLocale() as 'en' | 'cs';
	return value[locale] ?? value.en ?? Object.values(value)[0];
}

export function blockLabel(type: string): string {
	return messages[`block_type_${type}`]?.() ?? fromDefinition(getBlockDefinition(type)?.label) ?? type;
}

export function blockDesc(type: string): string {
	return messages[`block_desc_${type}`]?.() ?? fromDefinition(getBlockDefinition(type)?.description) ?? '';
}
