// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		/**
		 * On Cloudflare Pages, adapter-auto installs adapter-cloudflare, which
		 * provides these. Both are optional because `vite dev` has no platform.
		 *
		 * If the project switches to adapter-cloudflare explicitly, delete these
		 * two fields: its own ambient types declare them, and a second, optional
		 * declaration would conflict.
		 */
		interface Platform {
			caches?: CacheStorage & { default: Cache };
			ctx?: { waitUntil(promise: Promise<unknown>): void };
		}
	}
}

export {};
