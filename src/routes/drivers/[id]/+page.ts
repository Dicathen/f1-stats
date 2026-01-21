import { error } from '@sveltejs/kit';

export const load = ({ params }) => {
	if (!params.id) throw error(404);
	return { driverId: params.id };
};
