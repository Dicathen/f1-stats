<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';

	const isRateLimit = $derived(page.status === 429);
</script>

<svelte:head>
	<title>{page.status} · F1 Stats</title>
</svelte:head>

<div class="mx-auto max-w-xl py-16 text-center">
	<p class="text-primary mb-2 font-mono text-6xl font-bold">{page.status}</p>
	<h1 class="mb-4 text-2xl font-bold">
		{isRateLimit ? 'Too many requests' : 'Something went wrong'}
	</h1>
	<p class="text-muted-foreground mb-8">
		{page.error?.message ?? 'An unexpected error occurred.'}
	</p>
	<div class="flex justify-center gap-3">
		<Button href="/">Back to home</Button>
		{#if isRateLimit}
			<Button variant="outline" onclick={() => location.reload()}>Try again</Button>
		{/if}
	</div>
</div>
