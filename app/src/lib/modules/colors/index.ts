import * as m from '$lib/paraglide/messages';
import { IconPalette } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'colors',
	href: '/admin/colors',
	group: 'brand',
	order: 30,
	icon: IconPalette,
	label: m.admin_colors,
});
