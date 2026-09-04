import { getFromCache, saveToCache } from './cache';

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

/** The `fetch` supplied to a SvelteKit `load`, or the global one. */
type Fetcher = typeof globalThis.fetch;

export interface RequestOptions {
	/**
	 * Pass the `fetch` from a `load` function. SvelteKit then inlines the
	 * response into the SSR payload so the client does not refetch on hydration.
	 */
	fetch?: Fetcher;
}

export class ApiError extends Error {
	readonly status?: number;
	/** Seconds to wait, when the API sent a Retry-After header with a 429. */
	readonly retryAfter?: number;

	constructor(
		message: string,
		options: { status?: number; retryAfter?: number; cause?: unknown } = {}
	) {
		super(message, { cause: options.cause });
		this.name = 'ApiError';
		this.status = options.status;
		this.retryAfter = options.retryAfter;
	}

	/** jolpica rate-limits aggressively; callers surface this differently. */
	get isRateLimited(): boolean {
		return this.status === 429;
	}
}

/**
 * Requests already in flight, keyed by cache key. Without this, two callers
 * that start the same request concurrently both miss the cache and both hit
 * the network -- which is exactly what a driver page does when it asks for a
 * driver's results and their season stats at the same time.
 */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Throws `ApiError` on failure rather than returning null, so callers can tell
 * "the season has no races" apart from "the request failed".
 */
async function fetchWithCache<T>(
	endpoint: string,
	cacheKey: string,
	options: RequestOptions = {}
): Promise<T> {
	const cached = getFromCache<T>(cacheKey);
	if (cached !== null) return cached;

	const pending = inFlight.get(cacheKey);
	if (pending) return pending as Promise<T>;

	const request = fetchUncached<T>(endpoint, options).then((data) => {
		saveToCache(cacheKey, data);
		return data;
	});

	inFlight.set(cacheKey, request);
	try {
		return await request;
	} finally {
		inFlight.delete(cacheKey);
	}
}

async function fetchUncached<T>(endpoint: string, options: RequestOptions): Promise<T> {
	const doFetch = options.fetch ?? globalThis.fetch;

	let response: Response;
	try {
		response = await doFetch(`${BASE_URL}${endpoint}`);
	} catch (cause) {
		throw new ApiError(`Could not reach the F1 API (${endpoint})`, { cause });
	}

	if (!response.ok) {
		const retryAfterHeader = response.headers.get('retry-after');
		const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
		throw new ApiError(
			response.status === 429
				? 'The F1 API rate limit was hit. Please try again shortly.'
				: `The F1 API returned ${response.status} for ${endpoint}`,
			{ status: response.status, retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined }
		);
	}

	return (await response.json()) as T;
}

function buildCacheKey(...parts: (string | number)[]): string {
	return parts.join('_');
}

/* eslint-disable @typescript-eslint/no-explicit-any --
   Walks an arbitrary path through an untyped JSON payload; the cast to T[] at
   the end is the boundary where callers reassert the shape. */
function extractErgastList<T>(data: any, path: string[]): T[] {
	if (!data) return [];
	let current: any = data.MRData;
	for (const key of path) {
		current = current?.[key];

		if (current === undefined || current === null) return [];
	}
	return Array.isArray(current) ? current : [];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface Driver {
	driverId: string;
	givenName: string;
	familyName: string;
	dateOfBirth: string;
	nationality: string;
	permanentNumber?: string;
	code?: string;
	/** Absent for reserve and test drivers, who the API still lists as current. */
	url?: string;
}

export interface Standing {
	position: string;
	points: string;
	wins: string;
	Driver: Driver;
	Constructors: Array<{ constructorId: string; name: string }>;
}

export interface Race {
	season: string;
	round: string;
	raceName: string;
	Circuit: {
		circuitId: string;
		circuitName: string;
		Location: {
			locality: string;
			country: string;
		};
	};
	date: string;
	time?: string;
	Results?: Array<{
		position: string;
		points: string;
		Driver: Driver;
		Constructor: { name: string };
		Time?: { time: string };
		status: string;
		laps: string;
		grid: string;
		FastestLap?: {
			rank: string;
		};
	}>;
}

// A single entry of a lap's `Timings` array. Note the API returns `driverId`
// here and carries the lap number on the enclosing `Laps[].number`, not here.
export interface LapTiming {
	driverId: string;
	position: string;
	time: string;
}

export interface Lap {
	number: string;
	Timings: LapTiming[];
}

export interface SeasonStats {
	wins: number;
	podiums: number;
	poles: number;
	fastestLaps: number;
	totalPoints: number;
	totalRaces: number;
	championshipPosition: string;
	championshipPoints: string;
	season: number;
	note?: string;
}

export interface DriverStats {
	wins: number;
	podiums: number;
	poles: number;
	fastestLaps: number;
	totalPoints: number;
}

// Get current season driver standings
export async function getDriverStandings(
	season: string | number = 'current',
	round: string | number = 'last',
	options: RequestOptions = {}
) {
	const cacheKey = buildCacheKey('driver_standings', season.toString(), round.toString());
	const data = await fetchWithCache(`/${season}/${round}/driverStandings.json`, cacheKey, options);

	const standings = extractErgastList<Standing>(data, [
		'StandingsTable',
		'StandingsLists',
		'0',
		'DriverStandings'
	]);
	return standings;
}

// Get all drivers for a season
export async function getDrivers(
	season: string | number = 'current',
	options: RequestOptions = {}
) {
	const cacheKey = buildCacheKey('drivers', season.toString());
	const data = await fetchWithCache(`/${season}/drivers.json?limit=100`, cacheKey, options);

	return extractErgastList<Driver>(data, ['DriverTable', 'Drivers']);
}

// Get specific driver details
export async function getDriver(driverId: string, options: RequestOptions = {}) {
	const cacheKey = buildCacheKey('driver', driverId);
	const data = await fetchWithCache(
		`/drivers/${encodeURIComponent(driverId)}.json`,
		cacheKey,
		options
	);

	const drivers = extractErgastList<Driver>(data, ['DriverTable', 'Drivers']);
	return drivers[0];
}

// Get driver results for current/recent season
export async function getDriverResults(
	driverId: string,
	season: string | number = 'current',
	options: RequestOptions = {}
) {
	const cacheKey = buildCacheKey('driver_results', driverId, season.toString());
	const data = await fetchWithCache(
		`/${season}/drivers/${encodeURIComponent(driverId)}/results.json?limit=100`,
		cacheKey,
		options
	);

	return extractErgastList<Race>(data, ['RaceTable', 'Races']);
}

export async function getRaces(season: string | number = 'current', options: RequestOptions = {}) {
	const cacheKey = buildCacheKey('races', season.toString());
	const data = await fetchWithCache(`/${season}.json?limit=100`, cacheKey, options);

	return extractErgastList<Race>(data, ['RaceTable', 'Races']);
}

// The season schedule endpoint never includes `Results`, so winners have to
// come from the position-filtered endpoint. Filtering to P1 keeps this to a
// single request per season instead of one per round.
export async function getSeasonWinners(
	season: string | number = 'current',
	options: RequestOptions = {}
) {
	const cacheKey = buildCacheKey('season_winners', season.toString());
	const data = await fetchWithCache(`/${season}/results/1.json?limit=100`, cacheKey, options);

	return extractErgastList<Race>(data, ['RaceTable', 'Races']);
}

// Season schedule with each completed round's winner merged in, for list views.
export async function getRacesWithWinners(
	season: string | number = 'current',
	options: RequestOptions = {}
): Promise<Race[]> {
	const [races, winners] = await Promise.all([
		getRaces(season, options),
		getSeasonWinners(season, options)
	]);

	const winnerByRound = new Map(
		winners.flatMap((w) => {
			const result = w.Results?.[0];
			return result ? [[w.round, result] as const] : [];
		})
	);

	return races.map((race) => {
		const winner = winnerByRound.get(race.round);
		return winner ? { ...race, Results: [winner] } : race;
	});
}

// Get specific race results
export async function getRaceResults(
	season: string | number,
	round: string | number,
	options: RequestOptions = {}
) {
	const cacheKey = buildCacheKey('race_results', season.toString(), round.toString());
	const data = await fetchWithCache(`/${season}/${round}/results.json`, cacheKey, options);
	const races = extractErgastList<Race>(data, ['RaceTable', 'Races']);

	return races[0];
}

// Get lap times for a specific driver in a race
export async function getDriverLapTimes(
	season: string | number,
	round: string | number,
	driverId: string,
	options: RequestOptions = {}
) {
	const cacheKey = buildCacheKey('lap_times', season.toString(), round.toString(), driverId);
	// jolpica silently clamps `limit` to 100; no F1 race exceeds 100 laps.
	const data = await fetchWithCache(
		`/${season}/${round}/drivers/${encodeURIComponent(driverId)}/laps.json?limit=100`,
		cacheKey,
		options
	);
	const laps = extractErgastList<Lap>(data, ['RaceTable', 'Races', '0', 'Laps']);
	return laps.flatMap((lap) => lap.Timings ?? []);
}

export function calculateDriverStats(races: Race[]): DriverStats {
	let wins = 0;
	let podiums = 0;
	let poles = 0;
	let fastestLaps = 0;
	let totalPoints = 0;
	races.forEach((race) => {
		const result = race.Results?.[0];
		if (result) {
			const position = parseInt(result.position, 10);
			const points = parseFloat(result.points);
			if (position === 1) wins++;
			if (position <= 3) podiums++;
			totalPoints += points;
			if (result.grid === '1') poles++;
			if (result.FastestLap?.rank === '1') fastestLaps++;
		}
	});
	return { wins, podiums, poles, fastestLaps, totalPoints };
}

// Helper to format lap time string to seconds
export function lapTimeToSeconds(timeStr: string): number {
	const parts = timeStr.split(':');
	if (parts.length === 2) {
		const minutes = Number.parseInt(parts[0]);
		const seconds = Number.parseFloat(parts[1]);
		return minutes * 60 + seconds;
	}
	return Number.parseFloat(timeStr);
}

export async function getDriverCurrentStats(
	driverId: string,
	options: RequestOptions = {}
): Promise<SeasonStats> {
	const cacheKey = buildCacheKey('driver_current_stats', driverId);
	const cached = getFromCache<SeasonStats>(cacheKey);
	if (cached) {
		return cached;
	}

	// These two requests are independent; awaiting them in series doubled the
	// time to first paint on a driver page.
	const [results, standings] = await Promise.all([
		getDriverResults(driverId, 'current', options),
		getDriverStandings('current', 'last', options)
	]);

	const stats = calculateDriverStats(results);
	const driverStanding = standings.find((s: Standing) => s.Driver.driverId === driverId);

	const currentYear = new Date().getFullYear();
	const seasonStats: SeasonStats = {
		...stats,
		totalRaces: results.length,
		championshipPosition: driverStanding?.position ?? 'N/A',
		championshipPoints: driverStanding?.points ?? '0',
		season: currentYear,
		note:
			results.length === 0 ? `Pre-season for ${currentYear}: No races completed yet.` : undefined
	};

	saveToCache(cacheKey, seasonStats);
	return seasonStats;
}
