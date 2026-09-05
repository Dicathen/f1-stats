import { getFromCache, saveToCache } from './cache';
import type { RequestOptions } from './jolpica';

const REST_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const ACTION_API = 'https://en.wikipedia.org/w/api.php';

/**
 * Wikimedia's API etiquette asks callers to identify themselves and throttles
 * anonymous traffic that does not. Browsers forbid setting User-Agent, so
 * Wikimedia accepts this header instead and allows it cross-origin.
 */
const WIKI_HEADERS = {
	'Api-User-Agent': 'f1-stats (https://github.com/Dicathen/f1-stats)'
};

export interface DriverPhoto {
	src: string;
	width: number;
	height: number;
	/** Commons file page, for the attribution link. */
	descriptionUrl: string;
	/** Plain-text photographer credit; empty when Commons records none. */
	artist: string;
	/** e.g. "CC BY-SA 4.0". Empty when unknown. */
	license: string;
}

/** Commons returns `Artist` as an HTML fragment; this is rendered as text, never as HTML. */
function stripHtml(value: string): string {
	return value
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim();
}

/** "http://en.wikipedia.org/wiki/Max_Verstappen" -> "Max_Verstappen" */
function articleTitle(wikipediaUrl: string | undefined): string | null {
	if (!wikipediaUrl) return null;
	try {
		const url = new URL(wikipediaUrl);
		if (!url.hostname.endsWith('wikipedia.org')) return null;
		if (!url.pathname.startsWith('/wiki/')) return null;
		return decodeURIComponent(url.pathname.slice('/wiki/'.length)) || null;
	} catch {
		return null;
	}
}

/**
 * Pulls the Commons file name out of a thumbnail URL, which looks like
 * `/wikipedia/commons/thumb/5/52/Some_File.jpg/330px-Some_File.jpg`.
 *
 * Returns null for anything not under `commons`: a file served from
 * `/wikipedia/en/` was uploaded locally, which on en.wikipedia almost always
 * means non-free fair-use media that must not be reused here.
 */
function commonsFileName(thumbnailUrl: string): string | null {
	try {
		const { pathname } = new URL(thumbnailUrl);
		if (!pathname.startsWith('/wikipedia/commons/')) return null;
		const match = pathname.match(/\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)\//);
		return match ? decodeURIComponent(match[1]) : null;
	} catch {
		return null;
	}
}

/**
 * Lead photo for a driver's Wikipedia article, with the credit its licence
 * requires. Wikimedia images are freely licensed but nearly all of them set
 * AttributionRequired, so the photographer and licence come back with the URL.
 *
 * Returns null rather than throwing: a missing portrait must not take down the
 * driver page.
 */
export async function getDriverPhoto(
	wikipediaUrl: string | undefined,
	options: RequestOptions = {}
): Promise<DriverPhoto | null> {
	const title = articleTitle(wikipediaUrl);
	if (!title) return null;

	const cacheKey = `driver_photo_${title}`;
	const cached = getFromCache<DriverPhoto>(cacheKey);
	if (cached) return cached;

	const doFetch = options.fetch ?? globalThis.fetch;

	try {
		const summaryResponse = await doFetch(`${REST_SUMMARY}/${encodeURIComponent(title)}`, {
			headers: WIKI_HEADERS
		});
		if (!summaryResponse.ok) return null;

		const summary = await summaryResponse.json();
		const thumbnail = summary?.thumbnail;
		if (!thumbnail?.source) return null;

		// Drop Wikimedia's analytics query so the markup carries a clean URL.
		const src = String(thumbnail.source).split('?')[0];

		const fileName = commonsFileName(src);
		if (!fileName) return null;

		const params = new URLSearchParams({
			action: 'query',
			format: 'json',
			formatversion: '2',
			origin: '*', // required for CORS on client-side navigations
			prop: 'imageinfo',
			iiprop: 'extmetadata|url',
			titles: `File:${fileName}`
		});
		const infoResponse = await doFetch(`${ACTION_API}?${params}`, { headers: WIKI_HEADERS });
		const info = infoResponse.ok
			? (await infoResponse.json())?.query?.pages?.[0]?.imageinfo?.[0]
			: undefined;
		const meta = info?.extmetadata ?? {};

		const photo: DriverPhoto = {
			src,
			width: Number(thumbnail.width) || 0,
			height: Number(thumbnail.height) || 0,
			descriptionUrl:
				info?.descriptionurl ??
				`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`,
			artist: stripHtml(meta.Artist?.value ?? ''),
			license: stripHtml(meta.LicenseShortName?.value ?? '')
		};

		if (photo.artist && photo.license) saveToCache(cacheKey, photo);
		return photo;
	} catch {
		return null;
	}
}
