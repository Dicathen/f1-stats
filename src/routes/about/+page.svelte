<svelte:head>
	<title>About · F1 Stats</title>
	<meta
		name="description"
		content="About F1 Stats — a SvelteKit pet project built on the jolpica F1 API."
	/>
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
	<h1 class="mb-8 text-4xl font-bold">About</h1>

	<div class="bg-secondary/50 rounded-lg p-6">
		<div class="prose">
			<h2>Hi, I'm Alex</h2>

			<p>I'm a developer and Formula 1 enthusiast who built this website as a pet project.</p>

			<p>
				This project uses <a href="https://kit.svelte.dev" target="_blank" rel="noopener noreferrer"
					>SvelteKit</a
				>
				and the
				<a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noopener noreferrer"
					>jolpica f1 API</a
				> to provide 2025 F1 stats.
			</p>

			<p>
				Please note that the current year limitations are to respect jolpica's current rate limits.
				When they do release their general release and expand those limits, I plan to include more
				historical data.
			</p>

			<p>
				<a href="https://github.com/Dicathen" target="_blank" rel="noopener noreferrer">GitHub</a>
				•
				<a href="https://fluquor.com" target="_blank" rel="noopener noreferrer">Website</a>
			</p>
		</div>
	</div>
</div>

<style>
	/* These read the theme tokens in src/app.css, which are hex literals --
	   wrapping them in hsl() produced invalid colours and dropped every rule. */
	.prose {
		color: var(--muted-foreground);
	}
	.prose h2 {
		color: var(--foreground);
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}
	.prose p {
		margin-bottom: 1rem;
		line-height: 1.75;
	}
	.prose a {
		color: #e4a8ca;
		text-decoration: none;
	}
	.prose a:hover {
		text-decoration: underline;
	}
</style>
