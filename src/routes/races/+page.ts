import { getRacesWithWinners } from '$lib/api/jolpica';
import { toHttpError } from '$lib/api/errors';
import type { PageLoad } from './$types';

const EARLIEST_SEASON = 2020;

export const load: PageLoad = async ({ url, fetch }) => {
	const currentYear = new Date().getFullYear();
	const seasons = Array.from(
		{ length: currentYear - EARLIEST_SEASON + 1 },
		(_, i) => currentYear - i
	);

	// Driving the season from the URL lets SvelteKit serialise navigations, which
	// removes the out-of-order response bug the old click handler had.
	const requested = Number(url.searchParams.get('season'));
	const season = seasons.includes(requested) ? requested : currentYear;

	try {
		return { season, seasons, currentYear, races: await getRacesWithWinners(season, { fetch }) };
	} catch (cause) {
		toHttpError(cause);
	}
};
