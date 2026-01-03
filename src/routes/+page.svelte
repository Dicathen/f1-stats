<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { getDriverStandings, getRaces, type Standing, type Race } from '$lib/api/jolpica';
	import { getTeamColor } from '$lib/utils/team-colors';

	let currentStandings: Standing[] = $state([]);
	let recentRaces: Race[] = $state([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const [standings, races] = await Promise.all([
				getDriverStandings('current', 'last'),
				getRaces('current')
			]);

			currentStandings = standings.slice(0, 5); // Top 5 drivers

			const now = new Date();
			const completedRaces = races.filter((race) => {
				const raceDate = new Date(race.date);
				return raceDate < now || (race.Results && race.Results.legnth > 0);
			});
			recentRaces = completedRaces.slice(-3).reverse(); // Last 3 races
			loading = false;
		} catch (error) {
			console.error('Error fetching data:', error);
			loading = false;
		}
	});

	function getDriverSlug(driver: any) {
		return driver.Driver.driverId;
	}

	function getRaceSlug(race: Race) {
		return `${race.season}-${race.round}`;
	}
</script>

<div class="space-y-8">
	<!-- Hero Section -->
	<div class="relative overflow-hidden rounded-lg bg-card border border-border p-8 md:p-12">
		<div class="relative z-10">
			<h1 class="text-4xl md:text-6xl font-bold text-balance mb-4">
				Formula 1 <span class="text-primary">Statistics</span>
			</h1>
			<p class="text-xl text-muted-foreground max-w-2xl text-balance mb-6">
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
			{#if loading}
				<p class="text-muted-foreground">Loading standings...</p>
			{:else if currentStandings.length > 0}
				<div class="space-y-2">
					{#each currentStandings as standing}
						<a
							href="/drivers/{standing.Driver.driverId}"
							class="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
						>
							<div class="flex items-center gap-4">
								<div
									class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold"
								>
									{standing.position}
								</div>
								<div>
									<!-- Apply team color to driver name -->
									<p
										class="font-semibold"
										style="color: {getTeamColor(standing.Constructors[0]?.name)}"
									>
										{standing.Driver.givenName}
										{standing.Driver.familyName}
									</p>
									<p class="text-sm text-muted-foreground">{standing.Constructors[0]?.name}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="font-bold text-lg">{standing.points}</p>
								<p class="text-xs text-muted-foreground">points</p>
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
			{#if loading}
				<p class="text-muted-foreground">Loading races...</p>
			{:else if recentRaces.length > 0}
				<div class="grid gap-4 md:grid-cols-3">
					{#each recentRaces as race}
						<a
							href="/races/{getRaceSlug(race)}"
							class="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
						>
							<h3 class="font-semibold mb-1">{race.raceName}</h3>
							<p class="text-sm text-muted-foreground mb-2">{race.Circuit.circuitName}</p>
							<p class="text-xs text-muted-foreground mb-3">
								{new Date(race.date).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</p>
							{#if race.Results && race.Results[0]}
								<div class="flex items-center gap-2">
									<div class="w-2 h-2 rounded-full bg-primary"></div>
									<!-- Apply team color to winner name -->
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
