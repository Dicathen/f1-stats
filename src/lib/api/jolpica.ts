const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const CACHE_PREFIX = 'f1_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

const delay = (ms: number | undefined) => new Promise((resolve) => setTimeout(resolve, ms));

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

function getCacheKey(key: string): string {
	return `${CACHE_PREFIX}${key}`;
}

function getFromCache<T>(key: string): T | null {
	try {
		const cached = localStorage.getItem(getCacheKey(key));
		if (!cached) return null;

		const entry: CacheEntry<T> = JSON.parse(cached);
		const now = Date.now();

		if (now - entry.timestamp < CACHE_DURATION) {
			console.log('Cache hit for:', key);
			return entry.data;
		}

		localStorage.removeItem(getCacheKey(key));
		return null;
	} catch (error) {
		console.error('Error reading from cache:', error);
		return null;
	}
}

function saveToCache<T>(key: string, data: T): void {
	try {
		const entry: CacheEntry<T> = {
			data,
			timestamp: Date.now()
		};
		localStorage.setItem(getCacheKey(key), JSON.stringify(entry));
		console.log('Cached:', key);
	} catch (error) {
		console.error('Error saving to cache:', error);
	}
}

async function fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T | null> {
	const cached = getFromCache<T>(cacheKey);
	if (cached !== null) {
		return cached;
	}

	try {
		const response = await fetch(`${BASE_URL}${endpoint}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();

		saveToCache(cacheKey, data);

		return data;
	} catch (error) {
		console.error('Error fetching data:', error);
		return null;
	}
}

function buildCacheKey(...parts: (string | number)[]): string {
	return parts.join('_');
}

function extractErgastList<T>(data: any, path: string[]): T[] {
	if (!data) return [];
	let current: any = data.MRData;
	for (const key of path) {
		console.log('Current:', current);
		console.log('Key:', key);

		current = current?.[key];

		console.log('Result:', current);
		if (current === undefined || current === null) return [];
	}
	return Array.isArray(current) ? current : [];
}

export interface Driver {
	driverId: string;
	givenName: string;
	familyName: string;
	dateOfBirth: string;
	nationality: string;
	permanentNumber?: string;
	code?: string;
	url: string;
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

export interface LapTime {
	lap: string;
	position: string;
	time: string;
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

export interface DriverCareer {
	wins: number;
	poles: number;
	championships: number;
}

// Get current season driver standings
export async function getDriverStandings(
	season: string | number = 'current',
	round: string | number = 'last'
) {
	const cacheKey = buildCacheKey('driver_standings', season.toString(), round.toString());
	const data = await fetchWithCache(`/${season}/${round}/driverStandings.json`, cacheKey);

	const standings = extractErgastList<Standing>(data, [
		'StandingsTable',
		'StandingsLists',
		'0',
		'DriverStandings'
	]);
	return standings;
}

// Get all drivers for a season
export async function getDrivers(season: string | number = 'current') {
	const cacheKey = buildCacheKey('drivers', season.toString());
	const data = await fetchWithCache(`/${season}/drivers.json?limit=100`, cacheKey);

	return extractErgastList<Driver>(data, ['DriverTable', 'Drivers']);
}

// Get specific driver details
export async function getDriver(driverId: string) {
	const cacheKey = buildCacheKey('driver', driverId);
	const data = await fetchWithCache(`/drivers/${driverId}.json`, cacheKey);

	const drivers = extractErgastList<Driver>(data, ['DriverTable', 'Drivers']);
	return drivers[0];
}

// Get driver results for current/recent season
export async function getDriverResults(driverId: string, season: string | number = 'current') {
	const cacheKey = buildCacheKey('driver_results', driverId, season.toString());
	const data = await fetchWithCache(
		`/${season}/drivers/${driverId}/results.json?limit=100`,
		cacheKey
	);

	return extractErgastList<Race>(data, ['RaceTable', 'Races']);
}

export async function getRaces(season: string | number = 'current') {
	const cacheKey = buildCacheKey('races', season.toString());
	const data = await fetchWithCache(`/${season}.json?limit=100`, cacheKey);

	return extractErgastList<Race>(data, ['RaceTable', 'Races']);
}

// Get specific race results
export async function getRaceResults(season: string | number, round: string | number) {
	const cacheKey = buildCacheKey('race_results', season.toString(), round.toString());
	const data = await fetchWithCache(`/${season}/${round}/results.json`, cacheKey);
	const races = extractErgastList<Race>(data, ['RaceTable', 'Races']);

	return races[0];
}

// Get lap times for a specific driver in a race
export async function getDriverLapTimes(
	season: string | number,
	round: string | number,
	driverId: string
) {
	const cacheKey = buildCacheKey('lap_times', season.toString(), round.toString(), driverId);
	const data = await fetchWithCache(
		`/${season}/${round}/drivers/${driverId}/laps.json?limit=1000`,
		cacheKey
	);
	const laps =
		extractErgastList<{ Timings: LapTime[] }>(data, ['RaceTable', 'Races', '0', 'Laps']) ?? [];
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

export async function getDriverCurrentStats(driverId: string): Promise<SeasonStats> {
	const cacheKey = buildCacheKey('driver_current_stats', driverId);
	const cached = getFromCache<SeasonStats>(cacheKey);
	if (cached) {
		return cached;
	}

	const results = await getDriverResults(driverId, 'current');
	const stats = calculateDriverStats(results);

	const standings = await getDriverStandings('current');
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

export async function getDriverCareerStats(driverId: string) {
	const cacheKey = buildCacheKey('driver_career_stats', driverId);
	const cached = getFromCache<DriverCareer>(cacheKey);
	if (cached) {
		return cached;
	}
	const wins = fetch(`${BASE_URL}/drivers/${driverId}/results/1.json?limit=1`);
	await delay(250);
	const poles = fetch(`${BASE_URL}/drivers/${driverId}/qualifying/1.json?limit=1`);
	await delay(250);
	const championships = fetch(`${BASE_URL}/drivers/${driverId}/driverStandings/1.json?limit=1`);
}
