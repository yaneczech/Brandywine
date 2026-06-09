import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';

export const GET: RequestHandler = ({ params, url }) => {
	redirect(308, `/${params.slug}${url.search}`);
};
