<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { getRaces, type Race } from '$lib/api/jolpica';
	import { getTeamColor } from '$lib/utils/team-colors';
	
	let currentSeasonRaces = $state([]);
	let selectedSeason = $state(2025);
	let loading = $state(true);
	
	const currentYear = new Date().getFullYear();
	const seasons = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);
	
	async function loadRaces(season: number) {
		loading = true;
		try {
			const races = await getRaces(season);
			currentSeasonRaces = races;
			loading = false;
		} catch (error) {
			console.error(' Error fetching races:', error);
			loading = false;
		}
	}
	
	onMount(() => {
		loadRaces(selectedSeason);
	});
	
	function getRaceSlug(race: Race) {
		return `${race.season}-${race.round}`;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-4xl font-bold mb-2">Races</h1>
		<p class="text-muted-foreground">Browse race results and detailed statistics</p>
	</div>
	
	<!-- Season Selector -->
	<Card>
		<CardHeader>
			<CardTitle>Select Season</CardTitle>
			<CardDescription>Choose a season to view races</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-3 md:grid-cols-5">
				{#each seasons as season}
					<button 
						onclick={() => { selectedSeason = season; loadRaces(season); }}
						class="p-4 rounded-lg transition-colors text-left {selectedSeason === season ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'}"
					>
						<p class="text-2xl font-bold mb-1">{season}</p>
						<p class="text-xs {selectedSeason === season ? 'text-primary-foreground/70' : 'text-muted-foreground'}">
							{season === currentYear ? 'Current' : 'Historic'}
						</p>
					</button>
				{/each}
			</div>
		</CardContent>
	</Card>
	
	<!-- Races List -->
	<div>
		<div class="flex items-center gap-3 mb-4">
			<h2 class="text-2xl font-bold">{selectedSeason} Season</h2>
			{#if selectedSeason === currentYear}
				<Badge>Current</Badge>
			{/if}
		</div>
		
		{#if loading}
			<p class="text-muted-foreground">Loading races...</p>
		{:else if currentSeasonRaces.length > 0}
			<div class="grid gap-4 md:grid-cols-2">
				{#each currentSeasonRaces as race}
					<a href="/races/{getRaceSlug(race)}" class="block group">
						<Card class="h-full transition-all hover:border-primary/50 group-hover:shadow-lg">
							<CardHeader>
								<div class="flex items-start justify-between mb-2">
									<CardTitle class="text-lg group-hover:text-primary transition-colors">{race.raceName}</CardTitle>
									<Badge variant="outline">{race.Circuit.Location.country}</Badge>
								</div>
								<CardDescription>{race.Circuit.circuitName}</CardDescription>
							</CardHeader>
							<CardContent>
								<div class="flex items-center justify-between">
									{#if race.Results && race.Results[0]}
										<div>
											<p class="text-sm text-muted-foreground mb-1">Winner</p>
											<p class="font-semibold" style="color: {getTeamColor(race.Results[0].Constructor?.name)}">{race.Results[0].Driver.givenName} {race.Results[0].Driver.familyName}</p>
										</div>
									{/if}
									<div class="text-right">
										<p class="text-sm text-muted-foreground">
											{new Date(race.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
