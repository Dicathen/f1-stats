import { browser } from '$app/environment';

const CACHE_PREFIX = 'f1_cache_';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
// Lap-time payloads are the large ones; this keeps the store to a few hundred KB.
const MAX_ENTRIES = 120;

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

/**
 * localStorage is unavailable during SSR, and merely *touching* it throws in
 * some privacy modes, so every access goes through this.
 */
function storage(): Storage | null {
	if (!browser) return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

function getCacheKey(key: string): string {
	return `${CACHE_PREFIX}${key}`;
}

/** Our own keys, paired with their timestamps; unparseable entries sort oldest. */
function ownEntries(store: Storage): Array<{ key: string; timestamp: number }> {
	const entries: Array<{ key: string; timestamp: number }> = [];
	for (let i = 0; i < store.length; i++) {
		const key = store.key(i);
		if (!key?.startsWith(CACHE_PREFIX)) continue;
		let timestamp = 0;
		try {
			timestamp = JSON.parse(store.getItem(key) ?? '{}').timestamp ?? 0;
		} catch {
			timestamp = 0;
		}
		entries.push({ key, timestamp });
	}
	return entries;
}

/** Drop expired entries, then oldest-first until we are under `target`. */
function evict(store: Storage, target: number): void {
	const now = Date.now();
	const entries = ownEntries(store);

	for (const entry of entries) {
		if (now - entry.timestamp >= CACHE_DURATION) store.removeItem(entry.key);
	}

	const live = entries.filter((e) => now - e.timestamp < CACHE_DURATION);
	if (live.length <= target) return;

	live.sort((a, b) => a.timestamp - b.timestamp);
	for (const entry of live.slice(0, live.length - target)) {
		store.removeItem(entry.key);
	}
}

export function getFromCache<T>(key: string): T | null {
	const store = storage();
	if (!store) return null;

	try {
		const cached = store.getItem(getCacheKey(key));
		if (!cached) return null;

		const entry: CacheEntry<T> = JSON.parse(cached);
		if (Date.now() - entry.timestamp < CACHE_DURATION) return entry.data;

		store.removeItem(getCacheKey(key));
		return null;
	} catch {
		// A corrupt entry should not be able to wedge the cache.
		try {
			store.removeItem(getCacheKey(key));
		} catch {
			/* nothing further to try */
		}
		return null;
	}
}

export function saveToCache<T>(key: string, data: T): void {
	const store = storage();
	if (!store) return;

	const payload = JSON.stringify({ data, timestamp: Date.now() } satisfies CacheEntry<T>);

	try {
		evict(store, MAX_ENTRIES - 1);
		store.setItem(getCacheKey(key), payload);
	} catch {
		// Almost always QuotaExceededError. Previously this was swallowed and the
		// cache stayed permanently full; instead make room and try once more.
		try {
			evict(store, Math.floor(MAX_ENTRIES / 2));
			store.setItem(getCacheKey(key), payload);
		} catch {
			// Still no room (or storage is disabled) -- run uncached rather than throw.
		}
	}
}

/** Clears every entry this module owns, leaving other localStorage keys alone. */
export function clearCache(): void {
	const store = storage();
	if (!store) return;
	try {
		for (const { key } of ownEntries(store)) store.removeItem(key);
	} catch {
		/* nothing further to try */
	}
}
