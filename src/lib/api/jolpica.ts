// Jolpica F1 API utilities with caching
const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

const CACHE_PREFIX = 'f1_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

function getCacheKey(endpoint: string): string {
	return `${CACHE_PREFIX}${endpoint}`;
}

function getFromCache<T>(key: string): T | null {
	try {
		const cached = localStorage.getItem(getCacheKey(key));
		if (!cached) return null;

		const entry: CacheEntry<T> = JSON.parse(cached);
		const now = Date.now();

		// Check if cache is still valid
		if (now - entry.timestamp < CACHE_DURATION) {
			console.log('Cache hit for:', key);
			return entry.data;
		}

		// Cache expired, remove it
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
	// Check cache first
	const cached = getFromCache<T>(cacheKey);
	if (cached !== null) {
		return cached;
	}

	// Fetch from API
	try {
		const response = await fetch(`${BASE_URL}${endpoint}`);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();

		// Save to cache
		saveToCache(cacheKey, data);

		return data;
	} catch (error) {
		console.error('Error fetching data:', error);
		return null;
	}
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

// Get current season driver standings
export async function getDriverStandings(
	season: string | number = 'current',
	round: string | number = 'last'
) {
	const cacheKey = `driver_standings_${season}_${round}`;
	const data = await fetchWithCache(`/${season}/${round}/driverStandings.json`, cacheKey);

	if (!data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
		console.error('Unexpected response structure:', data);
		return [];
	}

	return data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
}

// Get all drivers for a season
export async function getDrivers(season: string | number = 'current') {
	const cacheKey = `drivers_${season}`;
	const data = await fetchWithCache(`/${season}/drivers.json?limit=100`, cacheKey);

	if (!data?.MRData?.DriverTable?.Drivers) {
		console.error('Unexpected response structure:', data);
		return [];
	}

	return data.MRData.DriverTable.Drivers;
}

// Get specific driver details
export async function getDriver(driverId: string) {
	const cacheKey = `driver_${driverId}`;
	const data = await fetchWithCache(`/drivers/${driverId}.json`, cacheKey);

	if (!data?.MRData?.DriverTable?.Drivers?.[0]) {
		console.error('Unexpected response structure:', data);
		return null;
	}

	return data.MRData.DriverTable.Drivers[0];
}

// Get driver results for current/recent season
export async function getDriverResults(driverId: string, season: string | number = 'current') {
	const cacheKey = `driver_results_${driverId}_${season}`;
	const data = await fetchWithCache(
		`/${season}/drivers/${driverId}/results.json?limit=100`,
		cacheKey
	);

	if (!data?.MRData?.RaceTable?.Races) {
		console.error('Unexpected response structure:', data);
		return [];
	}

	return data.MRData.RaceTable.Races;
}

// Get race schedule for a season
export async function getRaces(season: string | number = 'current') {
	const cacheKey = `races_${season}`;
	const data = await fetchWithCache(`/${season}.json?limit=100`, cacheKey);

	if (!data?.MRData?.RaceTable?.Races) {
		console.error('Unexpected response structure:', data);
		return [];
	}

	return data.MRData.RaceTable.Races;
}

// Get specific race results
export async function getRaceResults(season: string | number, round: string | number) {
	const cacheKey = `race_results_${season}_${round}`;
	const data = await fetchWithCache(`/${season}/${round}/results.json`, cacheKey);

	if (!data?.MRData?.RaceTable?.Races || data.MRData.RaceTable.Races.length === 0) {
		console.log(`No race results available for ${season} round ${round}`);
		return null;
	}

	if (!data.MRData.RaceTable.Races[0]) {
		console.error('Unexpected response structure:', data);
		return null;
	}

	return data.MRData.RaceTable.Races[0];
}

// Get lap times for a specific driver in a race
export async function getDriverLapTimes(
	season: string | number,
	round: string | number,
	driverId: string
) {
	const cacheKey = `lap_times_${season}_${round}_${driverId}`;
	const data = await fetchWithCache(
		`/${season}/${round}/drivers/${driverId}/laps.json?limit=1000`,
		cacheKey
	);

	if (!data?.MRData?.RaceTable?.Races?.[0]?.Laps) {
		console.error('Unexpected response structure:', data);
		return [];
	}

	return data.MRData.RaceTable.Races[0].Laps;
}

// Helper to calculate total wins, podiums, etc.
export function calculateDriverStats(races: Race[]) {
	let wins = 0;
	let podiums = 0;
	let poles = 0;
	let fastestLaps = 0;
	let totalPoints = 0;

	races.forEach((race) => {
		if (race.Results && race.Results.length > 0) {
			const result = race.Results[0];
			const position = Number.parseInt(result.position);
			const points = Number.parseFloat(result.points);

			if (position === 1) wins++;
			if (position <= 3) podiums++;
			totalPoints += points;

			// Check for pole position
			if (result.grid === '1') poles++;

			// Check for fastest lap
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

export async function getDriverCurrentStats(driverId: string) {
	try {
		const cacheKey = `driver_current_stats_${driverId}`;
		const cached = getFromCache(cacheKey);

		if (cached !== null) {
			return cached;
		}

		// Fetch 2025 results
		const results = await getDriverResults(driverId, 'current');

		// Calculate stats from 2025 results
		const stats = calculateDriverStats(results);

		// Get 2025 standings to get current championship position
		const standings = await getDriverStandings('current');
		const driverStanding = standings.find((s: Standing) => s.Driver.driverId === driverId);

		const seasonStats = {
			...stats,
			totalRaces: results.length,
			championshipPosition: driverStanding?.position || 'N/A',
			championshipPoints: driverStanding?.points || '0'
		};

		saveToCache(cacheKey, seasonStats);
		return seasonStats;
	} catch (error) {
		console.error('Error fetching Current stats:', error);
		return null;
	}
}
