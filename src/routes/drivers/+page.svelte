<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { getDrivers, getDriverStandings, type Driver, type Standing } from '$lib/api/jolpica';
	import { getTeamColor } from '$lib/utils/team-colors';

	let drivers: Array<Driver & { stats?: Standing }> = $state([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const [allDrivers, standings] = await Promise.all([
				getDrivers('current'),
				getDriverStandings('current', 'last')
			]);

			const validDrivers = allDrivers.filter((driver) => driver.code);

			// Merge driver info with standings
			drivers = validDrivers
				.map((driver) => {
					const standing = standings.find((s: Standing) => s.Driver.driverId === driver.driverId);
					return { ...driver, stats: standing };
				})
				.sort((a, b) => {
					// Sort by championship position
					const posA = a.stats ? parseInt(a.stats.position) : 999;
					const posB = b.stats ? parseInt(b.stats.position) : 999;
					return posA - posB;
				});

			loading = false;
		} catch (error) {
			console.error(' Error fetching drivers:', error);
			loading = false;
		}
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-4xl font-bold mb-2">Drivers</h1>
		<p class="text-muted-foreground">Browse current Formula 1 drivers and their statistics</p>
	</div>

	{#if loading}
		<p class="text-muted-foreground">Loading drivers...</p>
	{:else if drivers.length > 0}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each drivers as driver}
				<a href="/drivers/{driver.driverId}" class="block group">
					<Card class="h-full transition-all hover:border-primary/50 group-hover:shadow-lg">
						<CardHeader>
							<div class="flex items-start justify-between mb-2">
								<div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
									<span class="text-xl font-bold text-primary"
										>{driver.permanentNumber || driver.code || '?'}</span
									>
								</div>
								{#if driver.stats && parseInt(driver.stats.wins) > 0}
									<Badge variant="secondary" class="bg-primary/10 text-primary border-primary/20">
										{driver.stats.wins} wins
									</Badge>
								{/if}
							</div>
							<!-- Apply team color to driver name -->
							<CardTitle
								class="text-xl group-hover:text-primary transition-colors"
								style="color: {getTeamColor(driver.stats?.Constructors[0]?.name)}"
							>
								{driver.givenName}
								{driver.familyName}
							</CardTitle>
							<CardDescription>
								{#if driver.stats?.Constructors[0]}
									{driver.stats.Constructors[0].name} • {driver.nationality}
								{:else}
									{driver.nationality}
								{/if}
							</CardDescription>
						</CardHeader>
						{#if driver.stats}
							<CardContent>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<p class="text-2xl font-bold text-primary">{driver.stats.wins}</p>
										<p class="text-xs text-muted-foreground">Wins</p>
									</div>
									<div>
										<p class="text-2xl font-bold">{driver.stats.points}</p>
										<p class="text-xs text-muted-foreground">Points</p>
									</div>
								</div>
							</CardContent>
						{/if}
					</Card>
				</a>
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground">No drivers available</p>
	{/if}
</div>
