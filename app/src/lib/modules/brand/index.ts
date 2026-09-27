import * as m from '$lib/paraglide/messages';
import { IconRosette } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'brand',
	href: '/admin/brand',
	group: 'brand',
	order: 20,
	icon: IconRosette,
	label: m.admin_brand,
	minRole: 'admin',
});
