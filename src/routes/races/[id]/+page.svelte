<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import LapTimeBoxChart from '$lib/components/lap-time-box-chart.svelte';
	import LapTimeLineChart from '$lib/components/lap-time-line-chart.svelte';
	import { getDriverLapTimes, lapTimeToSeconds } from '$lib/api/jolpica';
	import { getTeamColor } from '$lib/utils/team-colors';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const race = $derived(data.race);

	type LapTimeSeries = { driver: string; lapTimes: number[]; color: string };

	let lapTimeData = $state<LapTimeSeries[]>([]);
	let lapTimesLoading = $state(true);
	let lapTimesFailed = $state(false);

	const driverColors = [
		'#3B82F6',
		'#EF4444',
		'#10B981',
		'#F97316',
		'#8B5CF6',
		'#EC4899',
		'#14B8A6',
		'#F59E0B',
		'#6366F1',
		'#84CC16'
	];

	// Lap times are three extra requests and only feed the charts, so they load
	// after the results rather than blocking first paint.
	$effect(() => {
		const { season, round } = data;
		const podium = race.Results?.slice(0, 3) ?? [];

		let cancelled = false;
		lapTimesLoading = true;
		lapTimesFailed = false;
		lapTimeData = [];

		if (podium.length === 0) {
			lapTimesLoading = false;
			return;
		}

		Promise.all(podium.map((result) => getDriverLapTimes(season, round, result.Driver.driverId)))
			.then((allLapTimes) => {
				if (cancelled) return;
				lapTimeData = allLapTimes
					.map((timings, index) => {
						const { Driver, Constructor } = podium[index];
						return {
							driver: `${Driver.givenName} ${Driver.familyName}`,
							lapTimes: timings.map((t) => lapTimeToSeconds(t.time)),
							color: getTeamColor(Constructor.name) || driverColors[index % driverColors.length]
						};
					})
					.filter((d) => d.lapTimes.length > 0);
			})
			.catch(() => {
				if (!cancelled) lapTimesFailed = true;
			})
			.finally(() => {
				if (!cancelled) lapTimesLoading = false;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

<svelte:head>
	<title>{race.raceName} {race.season} · F1 Stats</title>
	<meta
		name="description"
		content="Full classification for the {race.season} {race.raceName} at {race.Circuit
			.circuitName}, with lap-time distribution for the podium finishers."
	/>
</svelte:head>

<div class="space-y-6">
	<Button href="/races?season={race.season}" variant="ghost" class="mb-4">← Back to Races</Button>

	<!-- Race Header -->
	<div class="bg-card border-border rounded-lg border p-6 md:p-8">
		<div class="mb-4 flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 class="mb-2 text-3xl font-bold md:text-4xl">{race.raceName}</h1>
				<p class="text-muted-foreground text-lg">{race.Circuit.circuitName}</p>
			</div>
			<Badge class="bg-primary text-primary-foreground">
				{new Date(race.date).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}
			</Badge>
		</div>

		<div class="mt-6 grid gap-4 md:grid-cols-3">
			<div>
				<p class="text-muted-foreground mb-1 text-sm">Country</p>
				<p class="font-semibold">{race.Circuit.Location.country}</p>
			</div>
			<div>
				<p class="text-muted-foreground mb-1 text-sm">Location</p>
				<p class="font-semibold">{race.Circuit.Location.locality}</p>
			</div>
			<div>
				<p class="text-muted-foreground mb-1 text-sm">Round</p>
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
					{#each race.Results as result (result.Driver.driverId)}
						<a
							href="/drivers/{result.Driver.driverId}"
							class="hover:bg-secondary block transition-colors"
						>
							<div class="bg-secondary/50 flex items-center justify-between rounded-lg p-4">
								<div class="flex items-center gap-4">
									<div
										class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
										style="background-color: {parseInt(result.position, 10) === 1
											? '#FFD700'
											: parseInt(result.position, 10) === 2
												? '#C0C0C0'
												: parseInt(result.position, 10) === 3
													? '#CD7F32'
													: 'var(--color-muted)'}"
									>
										<span
											class="font-bold {parseInt(result.position, 10) <= 3
												? 'text-primary-foreground'
												: 'text-foreground'}">{result.position}</span
										>
									</div>
									<div>
										<p class="font-semibold" style="color: {getTeamColor(result.Constructor.name)}">
											{result.Driver.givenName}
											{result.Driver.familyName}
										</p>
										<p class="text-muted-foreground text-sm">{result.Constructor.name}</p>
									</div>
								</div>
								<div class="text-right">
									<p class="font-mono text-sm">
										{result.status !== 'Finished' ? result.status : result.Time?.time}
									</p>
									<p class="text-muted-foreground text-xs">{result.points} pts</p>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="text-muted-foreground">No results available</p>
			{/if}
		</CardContent>
	</Card>

	<!-- Lap Time Charts -->
	{#if lapTimesLoading}
		<p class="text-muted-foreground" aria-live="polite">Loading lap times…</p>
	{:else if lapTimesFailed}
		<p class="text-muted-foreground" aria-live="polite">Lap time data is unavailable right now.</p>
	{:else if lapTimeData.length > 0}
		<LapTimeBoxChart data={lapTimeData} />
		<LapTimeLineChart data={lapTimeData} />
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
						<p class="text-muted-foreground mb-1 text-sm">Winner</p>
						<p
							class="text-lg font-semibold"
							style="color: {getTeamColor(race.Results[0].Constructor.name)}"
						>
							{race.Results[0].Driver.givenName}
							{race.Results[0].Driver.familyName}
						</p>
					</div>
					<div>
						<p class="text-muted-foreground mb-1 text-sm">Winning Time</p>
						<p class="font-mono text-lg font-semibold">{race.Results[0].Time?.time || 'N/A'}</p>
					</div>
					<div>
						<p class="text-muted-foreground mb-1 text-sm">Total Finishers</p>
						<p class="text-lg font-semibold">
							{race.Results.filter((r) => r.status === 'Finished' || r.status === 'Lapped').length}
						</p>
					</div>
					<div>
						<p class="text-muted-foreground mb-1 text-sm">Season Round</p>
						<p class="text-lg font-semibold">Round {race.round} of {race.season}</p>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
