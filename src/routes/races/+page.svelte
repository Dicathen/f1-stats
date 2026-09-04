<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { getTeamColor } from '$lib/utils/team-colors';
	import type { Race } from '$lib/api/jolpica';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function getRaceSlug(race: Race) {
		return `${race.season}-${race.round}`;
	}
</script>

<svelte:head>
	<title>{data.season} Races · F1 Stats</title>
	<meta
		name="description"
		content="Formula 1 race calendar and results for the {data.season} season, including winners and lap-time analysis."
	/>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-4xl font-bold">Races</h1>
		<p class="text-muted-foreground">Browse race results and detailed statistics</p>
	</div>

	<!-- Season Selector: plain links, so the season lives in the URL and
	     SvelteKit serialises navigation instead of racing overlapping fetches. -->
	<Card>
		<CardHeader>
			<CardTitle>Select Season</CardTitle>
			<CardDescription>Choose a season to view races</CardDescription>
		</CardHeader>
		<CardContent>
			<nav class="grid gap-3 md:grid-cols-5" aria-label="Season">
				{#each data.seasons as season (season)}
					{@const isActive = season === data.season}
					<a
						href="/races?season={season}"
						aria-current={isActive ? 'page' : undefined}
						class="rounded-lg p-4 text-left transition-colors {isActive
							? 'bg-primary text-primary-foreground'
							: 'bg-secondary/50 hover:bg-secondary'}"
					>
						<p class="mb-1 text-2xl font-bold">{season}</p>
						<p class="text-xs {isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}">
							{season === data.currentYear ? 'Current' : 'Historic'}
						</p>
					</a>
				{/each}
			</nav>
		</CardContent>
	</Card>

	<!-- Races List -->
	<div>
		<div class="mb-4 flex items-center gap-3">
			<h2 class="text-2xl font-bold">{data.season} Season</h2>
			{#if data.season === data.currentYear}
				<Badge>Current</Badge>
			{/if}
		</div>

		{#if data.races.length > 0}
			<div class="grid gap-4 md:grid-cols-2">
				{#each data.races as race (getRaceSlug(race))}
					<a href="/races/{getRaceSlug(race)}" class="group block">
						<Card class="hover:border-primary/50 h-full transition-all group-hover:shadow-lg">
							<CardHeader>
								<div class="mb-2 flex items-start justify-between">
									<CardTitle class="group-hover:text-primary text-lg transition-colors"
										>{race.raceName}</CardTitle
									>
									<Badge variant="outline">{race.Circuit.Location.country}</Badge>
								</div>
								<CardDescription>{race.Circuit.circuitName}</CardDescription>
							</CardHeader>
							<CardContent>
								<div class="flex items-center justify-between">
									{#if race.Results && race.Results[0]}
										<div>
											<p class="text-muted-foreground mb-1 text-sm">Winner</p>
											<p
												class="font-semibold"
												style="color: {getTeamColor(race.Results[0].Constructor?.name)}"
											>
												{race.Results[0].Driver.givenName}
												{race.Results[0].Driver.familyName}
											</p>
										</div>
									{/if}
									<div class="text-right">
										<p class="text-muted-foreground text-sm">
											{new Date(race.date).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</a>
				{/each}
			</div>
		{:else}
			<p class="text-muted-foreground">No races available for this season</p>
		{/if}
	</div>
</div>
