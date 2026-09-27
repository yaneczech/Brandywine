import * as m from '$lib/paraglide/messages';
import { IconExtension } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'plugins',
	href: '/admin/plugins',
	group: 'admin',
	order: 30,
	icon: IconExtension,
	label: m.admin_plugins,
	minRole: 'admin',
});
