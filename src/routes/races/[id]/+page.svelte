<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import LapTimeBoxChart from '$lib/components/lap-time-box-chart.svelte';
	import { getRaceResults, getDriverLapTimes, lapTimeToSeconds, type Race } from '$lib/api/jolpica';
	import { getTeamColor } from '$lib/utils/team-colors';

	const raceId = $page.params.id;

	let race: Race | null = $state(null);
	let lapTimeData: Array<{ driver: string; lapTimes: number[]; color: string }> = $state([]);
	let loading = $state(true);

	const driverColors = [
		'#3B82F6', '#EF4444', '#10B981', '#F97316', '#8B5CF6',
		'#EC4899', '#14B8A6', '#F59E0B', '#6366F1', '#84CC16'
	];

	onMount(async () => {
		try {
			// Parse season and round from ID (format: "2024-1")
			const [season, round] = raceId.split('-');
			
			const raceData = await getRaceResults(season, round);
			race = raceData;
			
			// Fetch lap times for top 5 finishers
			if (race.Results && race.Results.length > 0) {
				const topDrivers = race.Results.slice(0, 3);
				const lapTimesPromises = topDrivers.map(result => 
					getDriverLapTimes(season, round, result.Driver.driverId)
				);
				
				const allLapTimes = await Promise.all(lapTimesPromises);
				
				lapTimeData = allLapTimes.map((laps, index) => {
					const driver = topDrivers[index].Driver;
					const constructorName = topDrivers[index].Constructor.name;
					const times = laps.flatMap((lap: any) => 
						lap.Timings
							.filter((t: any) => t.driverId === driver.driverId)
							.map((t: any) => lapTimeToSeconds(t.time))
					);
					
					return {
						driver: `${driver.givenName} ${driver.familyName}`,
						lapTimes: times,
						color: getTeamColor(constructorName) || driverColors[index % driverColors.length]
					};
				}).filter(d => d.lapTimes.length > 0);
			}
			
			loading = false;
		} catch (error) {
			console.error(' Error fetching race data:', error);
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<Button href="/races" variant="ghost" class="mb-4">
		← Back to Races
	</Button>
	
	{#if loading}
		<p class="text-muted-foreground">Loading race details...</p>
	{:else if race}
		<!-- Race Header -->
		<div class="bg-card border border-border rounded-lg p-6 md:p-8">
			<div class="flex items-start justify-between flex-wrap gap-4 mb-4">
				<div>
					<h1 class="text-3xl md:text-4xl font-bold mb-2">{race.raceName}</h1>
					<p class="text-muted-foreground text-lg">{race.Circuit.circuitName}</p>
				</div>
				<Badge class="bg-primary text-primary-foreground">
					{new Date(race.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
				</Badge>
			</div>
			
			<div class="grid gap-4 md:grid-cols-3 mt-6">
				<div>
					<p class="text-sm text-muted-foreground mb-1">Country</p>
					<p class="font-semibold">{race.Circuit.Location.country}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground mb-1">Location</p>
					<p class="font-semibold">{race.Circuit.Location.locality}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground mb-1">Round</p>
					<p class="font-semibold">{race.round}</p>
				</div>
			</div>
		</div>
		
		<!-- Race Results -->
		<Card>
			<CardHeader>
				<CardTitle>Race Results</CardTitle>
				<CardDescription>Final classification</CardDescription>
			</CardHeader>
			<CardContent>
				{#if race.Results && race.Results.length > 0}
					<div class="space-y-2">
						{#each race.Results as result}
							<div class="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
								<div class="flex items-center gap-4">
									<div class="w-10 h-10 rounded-full {parseInt(result.position) <= 3 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center flex-shrink-0">
										<span class="font-bold {parseInt(result.position) <= 3 ? 'text-primary-foreground' : 'text-foreground'}">{result.position}</span>
									</div>
									<div>
										<p class="font-semibold" style="color: {getTeamColor(result.Constructor.name)}">{result.Driver.givenName} {result.Driver.familyName}</p>
										<p class="text-sm text-muted-foreground">{result.Constructor.name}</p>
									</div>
								</div>
								<div class="text-right">
									<p class="font-mono text-sm">{result.Time?.time || result.status}</p>
									<p class="text-xs text-muted-foreground">{result.points} pts</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-muted-foreground">No results available</p>
				{/if}
			</CardContent>
		</Card>
		
		<!-- Lap Time Distribution Chart -->
		{#if lapTimeData.length > 0}
			<LapTimeBoxChart data={lapTimeData} />
		{/if}
		
		<!-- Race Stats -->
		<Card>
			<CardHeader>
				<CardTitle>Race Statistics</CardTitle>
			</CardHeader>
			<CardContent>
				{#if race.Results && race.Results[0]}
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<p class="text-sm text-muted-foreground mb-1">Winner</p>
							<p class="font-semibold text-lg" style="color: {getTeamColor(race.Results[0].Constructor.name)}">{race.Results[0].Driver.givenName} {race.Results[0].Driver.familyName}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground mb-1">Winning Time</p>
							<p class="font-semibold text-lg font-mono">{race.Results[0].Time?.time || 'N/A'}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground mb-1">Total Finishers</p>
							<p class="font-semibold text-lg">{race.Results.filter(r => r.status === 'Finished').length}</p>
						</div>
						<div>
							<p class="text-sm text-muted-foreground mb-1">Season Round</p>
							<p class="font-semibold text-lg">Round {race.round} of {race.season}</p>
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<p class="text-muted-foreground">Race not completed</p>
	{/if}
</div>
