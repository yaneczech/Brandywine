import * as m from '$lib/paraglide/messages';
import { IconFolder } from '$lib/icons';
import { defineModule } from '../types';

export default defineModule({
	id: 'assets',
	href: '/admin/assets',
	group: 'assets',
	order: 10,
	icon: IconFolder,
	label: m.admin_assets,
});
