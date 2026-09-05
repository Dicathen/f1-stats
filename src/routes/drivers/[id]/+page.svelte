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
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const driver = $derived(data.driver);
	const seasonStats = $derived(data.stats);
	const recentResults = $derived(data.recentResults);
	const photo = $derived(data.photo);
	const currentYear = new Date().getFullYear();

	// The API still returns plain-http Wikipedia links.
	const wikipediaUrl = $derived(driver.url?.replace(/^http:\/\//, 'https://'));
</script>

<svelte:head>
	<title>{driver.givenName} {driver.familyName} · F1 Stats</title>
	<meta
		name="description"
		content="{driver.givenName} {driver.familyName} ({driver.nationality}) — {currentYear} Formula 1 season wins, podiums, poles and championship position."
	/>
</svelte:head>

<div class="space-y-6">
	<Button href="/drivers" variant="ghost" class="mb-4">← Back to Drivers</Button>

	<!-- Driver Header -->
	<div class="bg-card border border-border rounded-lg p-6 md:p-8">
		<div class="flex items-start gap-6">
			<div class="flex-shrink-0">
				<div class="relative">
					{#if photo}
						<img
							src={photo.src}
							width={photo.width}
							height={photo.height}
							alt="{driver.givenName} {driver.familyName}"
							loading="eager"
							class="border-border bg-primary/10 h-28 w-28 rounded-full border object-cover object-top"
						/>
						{#if driver.permanentNumber || driver.code}
							<span
								class="bg-primary text-primary-foreground border-card absolute -right-1 -bottom-1 flex h-9 min-w-9 items-center justify-center rounded-full border-2 px-1.5 text-base font-bold"
							>
								{driver.permanentNumber || driver.code}
							</span>
						{/if}
					{:else}
						<div class="bg-primary/20 flex h-28 w-28 items-center justify-center rounded-full">
							<span class="text-primary text-4xl font-bold"
								>{driver.permanentNumber || driver.code || '?'}</span
							>
						</div>
					{/if}
				</div>
				{#if photo}
					<!-- Wikimedia images are free to reuse but set AttributionRequired. -->
					<p class="text-muted-foreground mt-2 max-w-28 text-[10px] leading-tight">
						<a
							href={photo.descriptionUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="hover:text-foreground underline underline-offset-2"
						>
							{photo.artist || 'Wikimedia Commons'}
						</a>
						{#if photo.license}
							· {photo.license}
						{/if}
					</p>
				{/if}
			</div>
			<div class="flex-1">
				<div class="flex items-start justify-between flex-wrap gap-4 mb-4">
					<div>
						<h1 class="text-3xl md:text-4xl font-bold mb-2">
							{#if wikipediaUrl}
								<a
									href={wikipediaUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-foreground hover:text-ring"
								>
									{driver.givenName}
									{driver.familyName}
								</a>
							{:else}
								{driver.givenName}
								{driver.familyName}
							{/if}
						</h1>
						<p class="text-muted-foreground">{driver.nationality}</p>
					</div>
					{#if seasonStats.championshipPosition !== 'N/A'}
						<Badge class="bg-primary text-primary-foreground">
							P{seasonStats.championshipPosition} in {currentYear} Championship
						</Badge>
					{:else}
						<Badge class="bg-primary text-primary-foreground">
							{seasonStats.note}
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
					{#each recentResults as race (`${race.season}-${race.round}`)}
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
</div>
