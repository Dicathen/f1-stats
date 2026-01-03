<script>
	import { marked } from 'marked';

	const content = `
## Hi, I'm Alex

I'm a developer and Formula 1 enthusiast who built this website as a pet project.

This project uses [SvelteKit](https://kit.svelte.dev) and the [jolpica f1 API](https://github.com/jolpica/jolpica-f1) to provide 2025 F1 stats.

Please note that the current year limitations are to respect jolpica's current rate limits. When they do release their general release and expand those limits, I plan to include more historical data.

[GitHub](https://github.com/Dicathen) • [Website](https://fluquor.com)
  `.trim();

	const html = marked(content);
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
	<h1 class="text-4xl font-bold mb-8">About</h1>

	<div class="rounded-lg bg-secondary/50 p-6">
		<div class="prose prose-invert max-w-none">
			{@html html}
		</div>
	</div>
</div>

<style>
	:global(.prose) {
		color: hsl(var(--muted-foreground));
	}
	:global(.prose h2) {
		color: hsl(var(--foreground));
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}
	:global(.prose p) {
		margin-bottom: 1rem;
		line-height: 1.75;
	}
	:global(.prose a) {
		color: #e4a8ca;
		text-decoration: none;
	}
	:global(.prose a:hover) {
		text-decoration: underline;
	}
</style>
