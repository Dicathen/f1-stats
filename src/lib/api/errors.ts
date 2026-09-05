import { error } from '@sveltejs/kit';
import { ApiError } from './jolpica';

/**
 * Converts an upstream failure into an HTTP error SvelteKit can render, so a
 * rate limit or outage reaches the user as an error page instead of silently
 * rendering as "no data available".
 */
export function toHttpError(cause: unknown): never {
	if (cause instanceof ApiError) {
		error(cause.isRateLimited ? 429 : 502, cause.message);
	}
	throw cause;
}
