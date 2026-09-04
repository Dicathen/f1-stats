import { error } from '@sveltejs/kit';
import { getDriver, getDriverResults, getDriverCurrentStats } from '$lib/api/jolpica';
import { getDriverPhoto } from '$lib/api/wikipedia';
import { toHttpError } from '$lib/api/errors';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const driverId = params.id;
	if (!driverId) error(404, 'Driver not found');

	try {
		const [driver, results, stats] = await Promise.all([
			getDriver(driverId, { fetch }),
			getDriverResults(driverId, 'current', { fetch }),
			getDriverCurrentStats(driverId, { fetch })
		]);

		if (!driver) error(404, `No driver found for "${driverId}"`);

		const completed = results.filter((race) => race.Results && race.Results.length > 0);

		// Resolves to null when there is no freely-licensed portrait; the page
		// falls back to the number badge, so this never blocks the load.
		const photo = await getDriverPhoto(driver.url, { fetch });

		return {
			driver,
			stats,
			photo,
			recentResults: completed.slice(-5).reverse()
		};
	} catch (cause) {
		toHttpError(cause);
	}
};
