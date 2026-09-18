const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;

/** Live data: matches the max-age jolpica itself sends. */
const LIVE_TTL = 10 * MINUTE;
/**
 * A finished season does not change, but jolpica does occasionally correct
 * data (late penalties, fixes). A month bounds how long a correction can take
 * to show, while keeping repeat requests off the API.
 */
const FINISHED_SEASON_TTL = 30 * DAY;
/** Driver bios and Wikipedia photos/credits change rarely, but do change. */
const REFERENCE_TTL = DAY;

const JOLPICA_PREFIX = '/ergast/f1/';

/**
 * How long, in seconds, a server-side response for `url` may be kept in the
 * edge cache, or `null` if it must not be cached at all.
 *
 * Every visitor's server render calls these APIs from Cloudflare's shared
 * outbound IPs, so without this they would all draw on one rate-limit budget.
 */
export function edgeCacheTtl(url: URL, now: Date = new Date()): number | null {
	if (url.hostname === 'api.jolpi.ca' && url.pathname.startsWith(JOLPICA_PREFIX)) {
		// "/ergast/f1/2024/1/results.json" -> "2024"; "/ergast/f1/2024.json" -> "2024"
		const first = url.pathname
			.slice(JOLPICA_PREFIX.length)
			.split('/')[0]
			.replace(/\.json$/, '');

		if (first === 'current') return LIVE_TTL;

		if (/^\d{4}$/.test(first)) {
			// Seasons run within a calendar year and finish in early December, so
			// any earlier year is complete. UTC keeps the rollover the same at
			// every data centre.
			return Number(first) < now.getUTCFullYear() ? FINISHED_SEASON_TTL : LIVE_TTL;
		}

		// Season-less lookups such as "/drivers/max_verstappen.json".
		return REFERENCE_TTL;
	}

	if (url.hostname === 'en.wikipedia.org') return REFERENCE_TTL;

	return null;
}

/**
 * Fetches through the Cloudflare Cache API. Only 200 responses are stored, so
 * a rate-limit or error response is never pinned in the cache.
 *
 * Storage is best-effort: if the cache refuses or fails, the live response is
 * still returned.
 */
export async function cachedFetch(
	request: Request,
	fetch: (request: Request) => Promise<Response>,
	cache: Cache,
	ttl: number,
	waitUntil?: (promise: Promise<unknown>) => void
): Promise<Response> {
	// Key on the URL alone so request headers (for example Wikipedia's
	// Api-User-Agent) cannot split one resource into several entries.
	const key = new Request(request.url, { method: 'GET' });

	try {
		const hit = await cache.match(key);
		if (hit) return hit;
	} catch {
		// A failed lookup is just a miss.
	}

	const response = await fetch(request);
	if (response.status !== 200) return response;

	const headers = new Headers(response.headers);
	headers.set('Cache-Control', `public, max-age=${ttl}`);
	// The Cache API refuses `Vary: *` and never stores `Set-Cookie`; `Age` and
	// `Expires` from the origin would fight with the max-age set above.
	for (const name of ['Vary', 'Set-Cookie', 'Age', 'Expires']) headers.delete(name);

	const stored = new Response(response.clone().body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});

	const write = cache.put(key, stored).catch(() => {
		// Too large, or refused by a directive: serve uncached.
	});
	if (waitUntil) waitUntil(write);
	else await write;

	return response;
}
