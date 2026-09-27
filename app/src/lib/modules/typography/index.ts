import * as m from '$lib/paraglide/messages';
import { IconTypography } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'typography',
	href: '/admin/typography',
	group: 'brand',
	order: 40,
	icon: IconTypography,
	label: m.admin_typography,
});
