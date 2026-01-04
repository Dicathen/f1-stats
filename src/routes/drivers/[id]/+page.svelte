<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		getDriver,
		getDriverResults,
		getDriverCurrentStats,
		type Driver,
		type Race
	} from '$lib/api/jolpica';

	const driverId = $derived($page.params.id);

	let driver = $state<Driver | null>(null);
	let recentResults = $state<Race[]>([]);
	let seasonStats = $state({
		wins: 0,
		podiums: 0,
		poles: 0,
		fastestLaps: 0,
		totalPoints: 0,
		totalRaces: 0,
		championshipPosition: 'N/A',
		championshipPoints: '0'
	});
	let loading = $state(true);
	let currentYear = new Date().getFullYear();

	onMount(async () => {
		try {
			const [driverData, results, stats] = await Promise.all([
				getDriver(driverId),
				getDriverResults(driverId, 'current'),
				getDriverCurrentStats(driverId)
			]);

			driver = driverData;
			const completedRaces = results.filter((race) => race.Results && race.Results.length > 0);
			recentResults = completedRaces.slice(-5).reverse(); // Last 5 completed races

			if (stats) {
				seasonStats = stats;
			}

			loading = false;
		} catch (error) {
			console.error(' Error fetching driver data:', error);
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<Button href="/drivers" variant="ghost" class="mb-4">← Back to Drivers</Button>

	{#if loading}
		<p class="text-muted-foreground">Loading driver profile...</p>
	{:else if driver}
		<!-- Driver Header -->
		<div class="bg-card border border-border rounded-lg p-6 md:p-8">
			<div class="flex items-start gap-6">
				<div
					class="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"
				>
					<span class="text-4xl font-bold text-primary"
						>{driver.permanentNumber || driver.code || '?'}</span
					>
				</div>
				<div class="flex-1">
					<div class="flex items-start justify-between flex-wrap gap-4 mb-4">
						<div>
							<h1 class="text-3xl md:text-4xl font-bold mb-2">
								{driver.givenName}
								{driver.familyName}
							</h1>
							<p class="text-muted-foreground">{driver.nationality}</p>
						</div>
						{#if seasonStats.championshipPosition !== 'N/A'}
							<Badge class="bg-primary text-primary-foreground">
								P{seasonStats.championshipPosition} in {currentYear} Championship
							</Badge>
						{/if}
					</div>
					<p class="text-balance">
						{#if seasonStats.wins > 0}
							In the {currentYear} season, {driver.familyName} has achieved {seasonStats.wins}
							{seasonStats.wins === 1 ? 'win' : 'wins'} and {seasonStats.podiums}
							{seasonStats.podiums === 1 ? 'podium' : 'podiums'}.
						{:else if seasonStats.totalRaces > 0}
							{driver.familyName} is competing in the {currentYear} Formula 1 season with {seasonStats.championshipPoints}
							points earned.
						{/if}
					</p>
				</div>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>{currentYear} Wins</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-3xl font-bold text-primary">{seasonStats.wins}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>{currentYear} Podiums</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-3xl font-bold">{seasonStats.podiums}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>{currentYear} Pole Positions</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-3xl font-bold">{seasonStats.poles}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>{currentYear} Season Points</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-3xl font-bold">{seasonStats.championshipPoints}</p>
				</CardContent>
			</Card>
		</div>

		<!-- Updated additional stats to show season-specific data -->
		<div class="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader class="pb-2">
					<CardDescription>{currentYear} Fastest Laps</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-3xl font-bold">{seasonStats.fastestLaps}</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-2">
					<CardDescription>{currentYear} Races Completed</CardDescription>
				</CardHeader>
				<CardContent>
					<p class="text-3xl font-bold">{seasonStats.totalRaces}</p>
				</CardContent>
			</Card>
		</div>

		<!-- Personal Info -->
		<Card>
			<CardHeader>
				<CardTitle>Personal Information</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<p class="text-sm text-muted-foreground mb-1">Nationality</p>
						<p class="font-medium">{driver.nationality}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground mb-1">Date of Birth</p>
						<p class="font-medium">
							{new Date(driver.dateOfBirth).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground mb-1">Driver Number</p>
						<p class="font-medium">{driver.permanentNumber || 'N/A'}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground mb-1">Driver Code</p>
						<p class="font-medium">{driver.code || 'N/A'}</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Recent Results -->
		<Card>
			<CardHeader>
				<CardTitle>Recent Race Results</CardTitle>
				<CardDescription>Latest performances in the {currentYear} season</CardDescription>
			</CardHeader>
			<CardContent>
				{#if recentResults.length > 0}
					<div class="space-y-2">
						{#each recentResults as race}
							{#if race.Results && race.Results[0]}
								{@const result = race.Results[0]}
								<a
									href="/races/{race.season}-{race.round}"
									class="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
								>
									<div class="flex items-center gap-4">
										<div
											class="w-8 h-8 rounded-full {parseInt(result.position) === 1
												? 'bg-primary'
												: 'bg-muted'} flex items-center justify-center"
										>
											<span
												class="font-bold {parseInt(result.position) === 1
													? 'text-primary-foreground'
													: 'text-foreground'}">{result.position}</span
											>
										</div>
										<p class="font-medium">{race.raceName}</p>
									</div>
									<p class="text-sm font-semibold">{result.points} pts</p>
								</a>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="text-muted-foreground">No recent results available</p>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<p class="text-muted-foreground">Driver not found</p>
	{/if}
</div>
