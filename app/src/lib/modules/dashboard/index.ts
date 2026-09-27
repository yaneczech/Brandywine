import * as m from '$lib/paraglide/messages';
import { IconLayoutDashboard } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'dashboard',
	href: '/admin',
	group: 'brand',
	order: 10,
	icon: IconLayoutDashboard,
	label: m.admin_dashboard,
});
