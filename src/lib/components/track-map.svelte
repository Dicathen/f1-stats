<script lang="ts">
	import { getTrackOutline } from '$lib/utils/circuits';

	let {
		circuitId,
		circuitName,
		class: className = ''
	}: { circuitId: string | undefined; circuitName: string; class?: string } = $props();

	const outline = $derived(getTrackOutline(circuitId));
	const lengthKm = $derived(
		outline?.length ? `${(outline.length / 1000).toFixed(3).replace(/0$/, '')} km` : null
	);
</script>

{#if outline}
	<figure class="m-0 flex flex-col items-center gap-2 {className}">
		<svg
			viewBox={outline.viewBox}
			class="text-primary h-auto w-full max-w-[200px]"
			role="img"
			aria-labelledby="track-{circuitId}"
		>
			<title id="track-{circuitId}">Track layout of {circuitName}</title>
			<!-- A wide, faint copy of the same path gives the line a soft halo. -->
			<path
				d={outline.path}
				fill="none"
				stroke="currentColor"
				stroke-width="34"
				stroke-linejoin="round"
				opacity="0.16"
			/>
			<path
				d={outline.path}
				fill="none"
				stroke="currentColor"
				stroke-width="14"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		</svg>
		<figcaption class="text-muted-foreground text-center text-[10px] leading-tight">
			{#if lengthKm}<span class="font-mono">{lengthKm}</span> ·{/if}
			layout ©
			<a
				href="https://github.com/bacinger/f1-circuits"
				target="_blank"
				rel="noopener noreferrer"
				class="hover:text-foreground underline underline-offset-2">T. Bacinger</a
			>
			(MIT)
		</figcaption>
	</figure>
{/if}
