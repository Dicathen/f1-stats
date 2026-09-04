import { getDriverStandings, getRacesWithWinners } from '$lib/api/jolpica';
import { toHttpError } from '$lib/api/errors';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const [standings, races] = await Promise.all([
			getDriverStandings('current', 'last', { fetch }),
			getRacesWithWinners('current', { fetch })
		]);

		const now = Date.now();
		const completed = races.filter(
			(race) => new Date(race.date).getTime() < now || (race.Results?.length ?? 0) > 0
		);

		return {
			standings: standings.slice(0, 5),
			recentRaces: completed.slice(-3).reverse()
		};
	} catch (cause) {
		toHttpError(cause);
	}
};
