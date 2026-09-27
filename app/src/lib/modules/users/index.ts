import * as m from '$lib/paraglide/messages';
import { IconUsers } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'users',
	href: '/admin/users',
	group: 'admin',
	order: 10,
	icon: IconUsers,
	label: m.admin_users,
	minRole: 'admin',
});
