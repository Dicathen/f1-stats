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
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Drivers · F1 Stats</title>
	<meta
		name="description"
		content="Every driver on the current Formula 1 grid, with championship position, wins and points."
	/>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="mb-2 text-4xl font-bold">Drivers</h1>
		<p class="text-muted-foreground">Browse current Formula 1 drivers and their statistics</p>
	</div>

	{#if data.drivers.length > 0}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.drivers as driver (driver.driverId)}
				<a href="/drivers/{driver.driverId}" class="group block">
					<Card class="hover:border-primary/50 h-full transition-all group-hover:shadow-lg">
						<CardHeader>
							<div class="mb-2 flex items-start justify-between">
								<div class="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
									<span class="text-primary text-xl font-bold"
										>{driver.permanentNumber || driver.code || '?'}</span
									>
								</div>
								{#if driver.stats && parseInt(driver.stats.wins, 10) > 0}
									<Badge variant="secondary" class="bg-primary/10 text-primary border-primary/20">
										{driver.stats.wins} wins
									</Badge>
								{/if}
							</div>
							<CardTitle
								class="group-hover:text-primary text-xl transition-colors"
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
										<p class="text-primary text-2xl font-bold">{driver.stats.wins}</p>
										<p class="text-muted-foreground text-xs">Wins</p>
									</div>
									<div>
										<p class="text-2xl font-bold">{driver.stats.points}</p>
										<p class="text-muted-foreground text-xs">Points</p>
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
