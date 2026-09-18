import type { HandleFetch } from '@sveltejs/kit';
import { cachedFetch, edgeCacheTtl } from '$lib/server/edge-cache';

/**
 * Wikimedia rejects requests without a User-Agent (HTTP 403), and the Workers
 * runtime sends none by default, so server-rendered driver pages never got a
 * photo. It is set here rather than in the shared API code because browsers
 * either drop a custom User-Agent or turn it into a CORS preflight that
 * Wikipedia does not allow; in the browser, its own User-Agent is sent anyway.
 */
const USER_AGENT = 'f1-stats (https://github.com/Dicathen/f1-stats)';

/**
 * Runs for the upstream API calls that `load` functions make during server
 * rendering; browser-side fetches never pass through here and keep using the
 * per-visitor localStorage cache.
 */
export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	if (!request.headers.has('user-agent')) {
		const headers = new Headers(request.headers);
		headers.set('user-agent', USER_AGENT);
		request = new Request(request, { headers });
	}

	const cache = event.platform?.caches?.default;
	if (!cache || request.method !== 'GET') return fetch(request);

	const ttl = edgeCacheTtl(new URL(request.url));
	if (ttl === null) return fetch(request);

	const ctx = event.platform?.ctx;
	return cachedFetch(request, fetch, cache, ttl, ctx && ((p) => ctx.waitUntil(p)));
};
