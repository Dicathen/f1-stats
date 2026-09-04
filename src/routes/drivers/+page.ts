import { getDrivers, getDriverStandings, type Driver, type Standing } from '$lib/api/jolpica';
import { toHttpError } from '$lib/api/errors';
import type { PageLoad } from './$types';

export type DriverWithStanding = Driver & { stats?: Standing };

export const load: PageLoad = async ({ fetch }) => {
	try {
		const [allDrivers, standings] = await Promise.all([
			getDrivers('current', { fetch }),
			getDriverStandings('current', 'last', { fetch })
		]);

		const standingByDriver = new Map(standings.map((s) => [s.Driver.driverId, s]));

		const drivers: DriverWithStanding[] = allDrivers
			.filter((driver) => driver.code)
			.map((driver) => ({ ...driver, stats: standingByDriver.get(driver.driverId) }))
			.sort((a, b) => {
				const posA = a.stats ? parseInt(a.stats.position, 10) : Number.MAX_SAFE_INTEGER;
				const posB = b.stats ? parseInt(b.stats.position, 10) : Number.MAX_SAFE_INTEGER;
				return posA - posB;
			});

		return { drivers };
	} catch (cause) {
		toHttpError(cause);
	}
};
