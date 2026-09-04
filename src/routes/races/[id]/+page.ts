import { error } from '@sveltejs/kit';
import { getRaceResults } from '$lib/api/jolpica';
import { toHttpError } from '$lib/api/errors';
import type { PageLoad } from './$types';

/** Race ids are "<season>-<round>", e.g. "2024-1". */
const RACE_ID = /^(\d{4})-(\d{1,2})$/;

export const load: PageLoad = async ({ params, fetch }) => {
	const match = RACE_ID.exec(params.id ?? '');
	if (!match) error(404, `"${params.id}" is not a valid race id`);

	const [, season, round] = match;

	try {
		const race = await getRaceResults(season, round, { fetch });
		if (!race) error(404, `No results for round ${round} of ${season}`);

		return { race, season, round };
	} catch (cause) {
		toHttpError(cause);
	}
};
