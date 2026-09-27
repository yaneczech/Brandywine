import * as m from '$lib/paraglide/messages';
import { IconSettings } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'settings',
	href: '/admin/settings',
	group: 'admin',
	order: 20,
	icon: IconSettings,
	label: m.admin_settings,
	minRole: 'admin',
});
