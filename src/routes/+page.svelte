<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { getTeamColor } from '$lib/utils/team-colors';
	import type { Race } from '$lib/api/jolpica';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function getRaceSlug(race: Race) {
		return `${race.season}-${race.round}`;
	}
</script>

<svelte:head>
	<title>F1 Stats · Formula 1 standings, drivers and race results</title>
	<meta
		name="description"
		content="Current Formula 1 season standings, driver profiles and race results, updated from the jolpica F1 API."
	/>
</svelte:head>

<div class="space-y-8">
	<!-- Hero Section -->
	<div class="bg-card border-border relative overflow-hidden rounded-lg border p-8 md:p-12">
		<div class="relative z-10">
			<h1 class="mb-4 text-4xl font-bold text-balance md:text-6xl">
				Formula 1 <span class="text-primary">Statistics</span>
			</h1>
			<p class="text-muted-foreground mb-6 max-w-2xl text-xl text-balance">
				Current F1 Season data, driver profiles, and race results.
			</p>
			<div class="flex gap-4">
				<Button href="/drivers" class="bg-primary hover:bg-primary/90">View Drivers</Button>
				<Button href="/races" variant="outline">Browse Races</Button>
			</div>
		</div>
	</div>

	<!-- Current Season Standings -->
	<Card>
		<CardHeader>
			<CardTitle>Current Season Standings</CardTitle>
			<CardDescription>Latest driver championship standings</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.standings.length > 0}
				<div class="space-y-2">
					{#each data.standings as standing (standing.Driver.driverId)}
						<a
							href="/drivers/{standing.Driver.driverId}"
							class="bg-secondary/50 hover:bg-secondary flex items-center justify-between rounded-lg p-4 transition-colors"
						>
							<div class="flex items-center gap-4">
								<div
									class="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-full font-bold"
								>
									{standing.position}
								</div>
								<div>
									<p
										class="font-semibold"
										style="color: {getTeamColor(standing.Constructors[0]?.name)}"
									>
										{standing.Driver.givenName}
										{standing.Driver.familyName}
									</p>
									<p class="text-muted-foreground text-sm">{standing.Constructors[0]?.name}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-lg font-bold">{standing.points}</p>
								<p class="text-muted-foreground text-xs">points</p>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground">No standings available</p>
			{/if}
		</CardContent>
	</Card>

	<!-- Recent Races -->
	<Card>
		<CardHeader>
			<CardTitle>Recent Races</CardTitle>
			<CardDescription>Latest race results</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.recentRaces.length > 0}
				<div class="grid gap-4 md:grid-cols-3">
					{#each data.recentRaces as race (getRaceSlug(race))}
						<a
							href="/races/{getRaceSlug(race)}"
							class="bg-secondary/50 hover:bg-secondary rounded-lg p-4 transition-colors"
						>
							<h3 class="mb-1 font-semibold">{race.raceName}</h3>
							<p class="text-muted-foreground mb-2 text-sm">{race.Circuit.circuitName}</p>
							<p class="text-muted-foreground mb-3 text-xs">
								{new Date(race.date).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</p>
							{#if race.Results && race.Results[0]}
								<div class="flex items-center gap-2">
									<div class="bg-primary h-2 w-2 rounded-full"></div>
									<p
										class="text-sm font-medium"
										style="color: {getTeamColor(race.Results[0].Constructor?.name)}"
									>
										{race.Results[0].Driver.givenName}
										{race.Results[0].Driver.familyName}
									</p>
								</div>
							{/if}
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground">No races available</p>
			{/if}
		</CardContent>
	</Card>
</div>
