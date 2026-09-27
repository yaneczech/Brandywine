import * as m from '$lib/paraglide/messages';
import { IconBook2 } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'manual',
	href: '/admin/manual',
	group: 'assets',
	order: 20,
	icon: IconBook2,
	label: m.admin_manual,
});
